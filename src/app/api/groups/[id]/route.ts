import { NextResponse } from "next/server";
import { getCurrentUser, requireGroupMember, requireGroupAdmin } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Group } from "@/lib/models/Group";
import { GroupMember } from "@/lib/models/GroupMember";
import { Expense } from "@/lib/models/Expense";
import { ExpenseSplit } from "@/lib/models/ExpenseSplit";
import { Settlement } from "@/lib/models/Settlement";
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

    const group = await Group.findById(groupId).populate("createdBy", "name email image");
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const members = await GroupMember.find({
      groupId: new mongoose.Types.ObjectId(groupId),
      status: "ACTIVE",
    }).populate("userId", "name email image defaultCurrency");

    const totalExpensesCount = await Expense.countDocuments({
      groupId: new mongoose.Types.ObjectId(groupId),
    });

    const expensesSum = await Expense.aggregate([
      { $match: { groupId: new mongoose.Types.ObjectId(groupId) } },
      { $group: { _id: null, totalPaise: { $sum: "$amountPaise" } } },
    ]);

    const totalExpensePaise = expensesSum[0]?.totalPaise || 0;

    return NextResponse.json({
      group,
      members: members.map((m) => ({
        _id: m._id,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.userId,
      })),
      stats: {
        totalExpensePaise,
        totalExpensesCount,
        memberCount: members.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching group:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch group" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id: groupId } = await params;
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    await requireGroupAdmin(groupId, user.id);

    const gid = new mongoose.Types.ObjectId(groupId);

    // Delete group and cascading records
    await Promise.all([
      Group.findByIdAndDelete(gid),
      GroupMember.deleteMany({ groupId: gid }),
      Expense.deleteMany({ groupId: gid }),
      ExpenseSplit.deleteMany({ groupId: gid }),
      Settlement.deleteMany({ groupId: gid }),
    ]);

    return NextResponse.json({ success: true, message: "Group deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting group:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete group" },
      { status: 500 }
    );
  }
}
