import { NextResponse } from "next/server";
import { getCurrentUser, requireGroupMember } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Invitation } from "@/lib/models/Invitation";
import { GroupMember } from "@/lib/models/GroupMember";
import { Group } from "@/lib/models/Group";
import { User } from "@/lib/models/User";
import { Notification } from "@/lib/models/Notification";
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

    // Check for existing pending invitation
    const existingInvite = await Invitation.findOne({
      groupId: gid,
      email: normalizedEmail,
      status: "PENDING",
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "A pending invitation already exists for this email." },
        { status: 400 }
      );
    }

    // Create unique token
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const invitation = await Invitation.create({
      groupId: gid,
      email: normalizedEmail,
      invitedBy: new mongoose.Types.ObjectId(user.id),
      token,
      status: "PENDING",
      expiresAt,
    });

    const origin =
      req.headers.get("origin") ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    const inviteLink = `${origin}/join?token=${token}`;

    // 1. Send real email using Nodemailer
    await sendInvitationEmail({
      to: normalizedEmail,
      groupName: group.name,
      inviterName: user.name || "A friend",
      inviteLink,
    });

    // 2. If user already has an account, also create an in-app Notification
    if (existingUser) {
      await Notification.create({
        userId: existingUser._id,
        title: "New Group Invitation",
        message: `${user.name || "A friend"} invited you to join "${group.name}".`,
        type: "INVITATION",
        link: `/join?token=${token}`,
        isRead: false,
      });
    }

    return NextResponse.json(
      {
        invitation,
        inviteLink: `/join?token=${token}`,
        message: "Invitation generated and email sent successfully.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create invitation" },
      { status: 400 }
    );
  }
}
