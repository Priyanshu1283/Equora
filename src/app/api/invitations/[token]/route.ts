import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Invitation } from "@/lib/models/Invitation";
import { GroupMember } from "@/lib/models/GroupMember";
import { Group } from "@/lib/models/Group";
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

    const userId = new mongoose.Types.ObjectId(user.id);

    // Check if already a member
    const existingMember = await GroupMember.findOne({
      groupId: invitation.groupId,
      userId,
    });

    if (existingMember) {
      if (existingMember.status === "ACTIVE") {
        invitation.status = "ACCEPTED";
        await invitation.save();
        return NextResponse.json({
          message: "Already a member of this group",
          groupId: invitation.groupId,
        });
      }
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

    return NextResponse.json({
      success: true,
      message: "Successfully joined group",
      groupId: invitation.groupId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
