import { NextResponse } from "next/server";
import { getCurrentUser, requireGroupMember } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Invitation } from "@/lib/models/Invitation";
import { GroupMember } from "@/lib/models/GroupMember";
import { Group } from "@/lib/models/Group";
import { User } from "@/lib/models/User";
import { notificationService } from "@/lib/notification.service";
import { inviteMemberSchema } from "@/lib/validations";
import { sendInvitationEmail } from "@/lib/email";
import crypto from "crypto";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id: groupId } = await params;
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    await requireGroupMember(groupId, user.id);

    const invites = await Invitation.find({
      groupId: new mongoose.Types.ObjectId(groupId),
      status: "PENDING",
    })
      .populate("invitedBy", "name email")
      .lean();

    return NextResponse.json({ invitations: invites });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id: groupId } = await params;
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { email } = inviteMemberSchema.parse({ ...body, groupId });
    const normalizedEmail = email.toLowerCase().trim();

    await connectToDatabase();
    await requireGroupMember(groupId, user.id);

    const gid = new mongoose.Types.ObjectId(groupId);
    const group = await Group.findById(gid).lean();
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if user is already a member
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const isAlreadyMember = await GroupMember.findOne({
        groupId: gid,
        userId: existingUser._id,
        status: "ACTIVE",
      });

      if (isAlreadyMember) {
        return NextResponse.json(
          { error: "User is already a member of this group." },
          { status: 400 }
        );
      }
    }

    let invitation = await Invitation.findOne({
      groupId: gid,
      email: normalizedEmail,
      status: "PENDING",
    });

    if (invitation && invitation.expiresAt <= new Date()) {
      invitation.status = "EXPIRED";
      await invitation.save();
      invitation = null;
    }

    const isNewInvitation = !invitation;
    if (!invitation) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      invitation = await Invitation.create({
        groupId: gid,
        email: normalizedEmail,
        invitedBy: new mongoose.Types.ObjectId(user.id),
        token: crypto.randomBytes(24).toString("hex"),
        status: "PENDING",
        expiresAt,
      });
    }

    const inviteLink = new URL(
      `/join?token=${invitation.token}`,
      new URL(req.url).origin
    ).toString();

    const emailSent = await sendInvitationEmail({
      to: normalizedEmail,
      groupName: group.name,
      inviterName: user.name || "A friend",
      inviteLink,
    });

    if (existingUser) {
      await notificationService.groupInvitation({
        invitedUserId: existingUser._id.toString(),
        groupId,
        groupName: group.name,
        inviterName: user.name || "A friend",
        invitationToken: invitation.token,
      });
    }

    return NextResponse.json(
      {
        invitation,
        inviteLink: `/join?token=${invitation.token}`,
        emailSent,
        message: emailSent
          ? isNewInvitation
            ? "Invitation created and email sent."
            : "Invitation email sent again."
          : "Invitation created, but email could not be sent. Share the link directly.",
      },
      { status: isNewInvitation ? 201 : 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create invitation" },
      { status: 400 }
    );
  }
}
