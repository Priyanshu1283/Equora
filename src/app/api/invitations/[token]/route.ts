import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Invitation } from "@/lib/models/Invitation";
import { GroupMember } from "@/lib/models/GroupMember";
import { Group } from "@/lib/models/Group";
import { notificationService } from "@/lib/notification.service";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { token } = await params;
    await connectToDatabase();

    const invitation = await Invitation.findOne({ token })
      .populate("groupId", "name description groupType")
      .populate("invitedBy", "name email image");

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
    }

    if (invitation.status !== "PENDING" || new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "Invitation has expired or already been used" },
        { status: 400 }
      );
    }

    return NextResponse.json({ invitation });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load invitation" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { token } = await params;
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to accept an invitation" },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const invitation = await Invitation.findOne({ token });
    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation token" }, { status: 404 });
    }

    if (invitation.status !== "PENDING" || new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "This invitation is no longer active" },
        { status: 400 }
      );
    }

    const invitedEmail = invitation.email.toLowerCase().trim();
    const signedInEmail = user.email?.toLowerCase().trim();
    if (!signedInEmail || signedInEmail !== invitedEmail) {
      return NextResponse.json(
        {
          error: `Sign in with ${invitedEmail} to accept this invitation.`,
        },
        { status: 403 }
      );
    }

    const userId = new mongoose.Types.ObjectId(user.id);

    // Check if already a member
    const existingMember = await GroupMember.findOne({
      groupId: invitation.groupId,
      userId,
    });

    const wasAlreadyActive = existingMember?.status === "ACTIVE";
    if (existingMember) {
      existingMember.status = "ACTIVE";
      await existingMember.save();
    } else {
      await GroupMember.create({
        groupId: invitation.groupId,
        userId,
        role: "MEMBER",
        status: "ACTIVE",
      });
    }

    invitation.status = "ACCEPTED";
    await invitation.save();

    // Notify group admin that invitation was accepted
    const [group, adminMembers] = await Promise.all([
      Group.findById(invitation.groupId).lean(),
      GroupMember.find({
        groupId: invitation.groupId,
        role: "ADMIN",
        status: "ACTIVE",
      }),
    ]);

    if (group) {
      await Promise.all(
        adminMembers
          .filter((admin) => admin.userId.toString() !== userId.toString())
          .map((admin) =>
            notificationService.invitationAccepted({
              adminId: admin.userId.toString(),
              groupId: invitation.groupId.toString(),
              groupName: group.name,
              acceptedByName: user.name || user.email || "Someone",
              invitationId: invitation._id.toString(),
            })
          )
      );
    }

    return NextResponse.json({
      success: true,
      message: wasAlreadyActive
        ? "You are already a member of this group."
        : "Successfully joined group.",
      groupId: invitation.groupId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
