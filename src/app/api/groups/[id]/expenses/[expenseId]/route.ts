import { NextResponse } from "next/server";
import { getCurrentUser, requireGroupMember } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Expense } from "@/lib/models/Expense";
import { ExpenseSplit } from "@/lib/models/ExpenseSplit";
import { createExpenseSchema } from "@/lib/validations";
import { calculateEqualSplit } from "@/lib/calculations/split";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string; expenseId: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id: groupId, expenseId } = await params;
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    await requireGroupMember(groupId, user.id);

    const expense = await Expense.findOne({
      _id: new mongoose.Types.ObjectId(expenseId),
      groupId: new mongoose.Types.ObjectId(groupId),
    }).populate("paidBy", "name email image");

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const splits = await ExpenseSplit.find({
      expenseId: expense._id,
    }).populate("userId", "name email image");

    return NextResponse.json({ expense, splits });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch expense" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { id: groupId, expenseId } = await params;
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createExpenseSchema.parse({ ...body, groupId });

    await connectToDatabase();
    await requireGroupMember(groupId, user.id);

    const eid = new mongoose.Types.ObjectId(expenseId);
    const gid = new mongoose.Types.ObjectId(groupId);

    const expense = await Expense.findOne({ _id: eid, groupId: gid });
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Recompute splits
    const splits = calculateEqualSplit(
      validatedData.amountPaise,
      validatedData.participantUserIds
    );

    // Update expense
    expense.title = validatedData.title;
    expense.amountPaise = validatedData.amountPaise;
    expense.category = validatedData.category;
    expense.paidBy = new mongoose.Types.ObjectId(validatedData.paidBy);
    expense.date = new Date(validatedData.date);
    expense.notes = validatedData.notes || "";
    await expense.save();

    // Replace splits
    await ExpenseSplit.deleteMany({ expenseId: eid });
    const splitDocs = splits.map((s) => ({
      expenseId: eid,
      groupId: gid,
      userId: new mongoose.Types.ObjectId(s.userId),
      sharePaise: s.sharePaise,
      isSettled: false,
    }));
    await ExpenseSplit.insertMany(splitDocs);

    return NextResponse.json({
      expense,
      splits: splitDocs,
      message: "Expense updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update expense" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id: groupId, expenseId } = await params;
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    await requireGroupMember(groupId, user.id);

    const eid = new mongoose.Types.ObjectId(expenseId);
    const gid = new mongoose.Types.ObjectId(groupId);

    await Promise.all([
      Expense.deleteOne({ _id: eid, groupId: gid }),
      ExpenseSplit.deleteMany({ expenseId: eid }),
    ]);

    return NextResponse.json({ success: true, message: "Expense deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete expense" },
      { status: 500 }
    );
  }
}
