import { NextResponse } from "next/server";
import { getCurrentUser, requireGroupMember } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Expense } from "@/lib/models/Expense";
import { ExpenseSplit } from "@/lib/models/ExpenseSplit";
import { GroupMember } from "@/lib/models/GroupMember";
import { createExpenseSchema } from "@/lib/validations";
import { calculateEqualSplit } from "@/lib/calculations/split";
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

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const memberId = searchParams.get("memberId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const query: any = { groupId: new mongoose.Types.ObjectId(groupId) };

    if (category && category !== "ALL") {
      query.category = category;
    }

    if (memberId) {
      query.paidBy = new mongoose.Types.ObjectId(memberId);
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const gid = new mongoose.Types.ObjectId(groupId);

    const [expenses, allSplits] = await Promise.all([
      Expense.find(query)
        .populate("paidBy", "name email image")
        .populate("createdBy", "name email")
        .sort({ date: -1, createdAt: -1 })
        .lean(),
      ExpenseSplit.find({ groupId: gid })
        .populate("userId", "name email image")
        .lean(),
    ]);

    // Group splits by expenseId
    const splitsByExpenseId: Record<string, any[]> = {};
    for (const split of allSplits) {
      const eid = split.expenseId.toString();
      if (!splitsByExpenseId[eid]) splitsByExpenseId[eid] = [];
      splitsByExpenseId[eid].push(split);
    }

    const enrichedExpenses = expenses.map((exp: any) => ({
      _id: exp._id,
      title: exp.title,
      amountPaise: exp.amountPaise,
      category: exp.category,
      date: exp.date,
      notes: exp.notes,
      paidBy: exp.paidBy,
      createdBy: exp.createdBy,
      createdAt: exp.createdAt,
      splits: splitsByExpenseId[exp._id.toString()] || [],
    }));

    return NextResponse.json({ expenses: enrichedExpenses });
  } catch (error: any) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch expenses" },
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
    const validatedData = createExpenseSchema.parse({ ...body, groupId });

    await connectToDatabase();
    await requireGroupMember(groupId, user.id);

    const gid = new mongoose.Types.ObjectId(groupId);

    // Verify payer is an active member
    const isPayerMember = await GroupMember.findOne({
      groupId: gid,
      userId: new mongoose.Types.ObjectId(validatedData.paidBy),
      status: "ACTIVE",
    });

    if (!isPayerMember) {
      return NextResponse.json(
        { error: "Selected payer is not an active member of this group." },
        { status: 400 }
      );
    }

    const splits = calculateEqualSplit(
      validatedData.amountPaise,
      validatedData.participantUserIds
    );

    const expense = await Expense.create({
      groupId: gid,
      title: validatedData.title,
      amountPaise: validatedData.amountPaise,
      category: validatedData.category,
      paidBy: new mongoose.Types.ObjectId(validatedData.paidBy),
      date: new Date(validatedData.date),
      notes: validatedData.notes || "",
      splitType: "EQUAL",
      createdBy: new mongoose.Types.ObjectId(user.id),
    });

    const splitDocs = splits.map((s) => ({
      expenseId: expense._id,
      groupId: gid,
      userId: new mongoose.Types.ObjectId(s.userId),
      sharePaise: s.sharePaise,
      isSettled: false,
    }));

    await ExpenseSplit.insertMany(splitDocs);

    return NextResponse.json(
      {
        expense,
        splits: splitDocs,
        message: "Expense recorded successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create expense" },
      { status: 400 }
    );
  }
}
