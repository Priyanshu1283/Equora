import { NextResponse } from "next/server";
import { getCurrentUser, requireGroupMember } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Settlement } from "@/lib/models/Settlement";
import { GroupMember } from "@/lib/models/GroupMember";
import { Group } from "@/lib/models/Group";
import { notificationService } from "@/lib/notification.service";
import { recordSettlementSchema } from "@/lib/validations";
import { formatPaiseToINR } from "@/lib/utils";
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

    const settlements = await Settlement.find({
      groupId: new mongoose.Types.ObjectId(groupId),
    })
      .populate("paidBy", "name email image")
      .populate("paidTo", "name email image")
      .sort({ date: -1, createdAt: -1 });

    return NextResponse.json({ settlements });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch settlements" },
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
    const validatedData = recordSettlementSchema.parse({ ...body, groupId });

    if (validatedData.paidBy === validatedData.paidTo) {
      return NextResponse.json(
        { error: "Sender and recipient cannot be the same person." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    await requireGroupMember(groupId, user.id);

    const gid = new mongoose.Types.ObjectId(groupId);

    // Verify both are active group members
    const members = await GroupMember.find({
      groupId: gid,
      userId: {
        $in: [
          new mongoose.Types.ObjectId(validatedData.paidBy),
          new mongoose.Types.ObjectId(validatedData.paidTo),
        ],
      },
      status: "ACTIVE",
    });

    if (members.length < 2) {
      return NextResponse.json(
        { error: "Both sender and recipient must be active group members." },
        { status: 400 }
      );
    }

    const settlement = await Settlement.create({
      groupId: gid,
      paidBy: new mongoose.Types.ObjectId(validatedData.paidBy),
      paidTo: new mongoose.Types.ObjectId(validatedData.paidTo),
      amountPaise: validatedData.amountPaise,
      date: new Date(validatedData.date),
      notes: validatedData.notes || "",
      status: "CONFIRMED",
    });

    const populated: any = await Settlement.findById(settlement._id)
      .populate("paidBy", "name email image")
      .populate("paidTo", "name email image");

    // Get group name for notification
    const group = await Group.findById(gid).lean();
    const groupName = (group as any)?.name || "your group";

    // Real-time notification via Pusher + save in MongoDB
    notificationService.settlementRecorded({
      receiverId: validatedData.paidTo,
      groupId,
      groupName,
      payerName: populated.paidBy?.name || "A member",
      amountFormatted: formatPaiseToINR(validatedData.amountPaise),
      settlementId: settlement._id.toString(),
    }).catch((e) => console.error("[Settlement notif]", e));

    return NextResponse.json(
      {
        settlement: populated,
        message: "Settlement recorded successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to record settlement" },
      { status: 400 }
    );
  }
}
