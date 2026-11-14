import { NextResponse } from "next/server";
import { getCurrentUser, requireGroupMember } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Expense } from "@/lib/models/Expense";
import { ExpenseSplit } from "@/lib/models/ExpenseSplit";
import { Settlement } from "@/lib/models/Settlement";
import { GroupMember } from "@/lib/models/GroupMember";
import {
  calculateGroupBalances,
  calculateSuggestedSettlements,
  type ExpenseRecord,
  type SettlementRecord,
} from "@/lib/calculations/balance";
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

    const gid = new mongoose.Types.ObjectId(groupId);

    // Parallel fetch using .lean() for high-performance sub-second response
    const [members, expenses, splits, settlements] = await Promise.all([
      GroupMember.find({
        groupId: gid,
        status: "ACTIVE",
      })
        .populate("userId", "name email image")
        .lean(),
      Expense.find({ groupId: gid }).lean(),
      ExpenseSplit.find({ groupId: gid }).lean(),
      Settlement.find({ groupId: gid, status: "CONFIRMED" }).lean(),
    ]);

    const memberUserIds = members.map((m: any) => m.userId?._id?.toString() || m.userId?.toString());

    // Group splits by expense
    const splitsMap: Record<string, Array<{ userId: string; sharePaise: number }>> = {};
    for (const s of splits) {
      const eid = s.expenseId.toString();
      if (!splitsMap[eid]) splitsMap[eid] = [];
      splitsMap[eid].push({
        userId: s.userId.toString(),
        sharePaise: s.sharePaise,
      });
    }

    const expenseRecords: ExpenseRecord[] = expenses.map((e) => ({
      _id: e._id.toString(),
      paidBy: e.paidBy.toString(),
      amountPaise: e.amountPaise,
      splits: splitsMap[e._id.toString()] || [],
      date: e.date,
    }));

    const settlementRecords: SettlementRecord[] = settlements.map((s) => ({
      _id: s._id.toString(),
      paidBy: s.paidBy.toString(),
      paidTo: s.paidTo.toString(),
      amountPaise: s.amountPaise,
      date: s.date,
      status: s.status,
    }));

    // Calculate balances & minimal settlement suggestions
    const balancesMap = calculateGroupBalances(
      memberUserIds,
      expenseRecords,
      settlementRecords
    );

    const suggestedSettlements = calculateSuggestedSettlements(balancesMap);

    // Enrich with member user profile data
    const memberProfileMap = new Map<string, any>();
    for (const m of members as any[]) {
      const u = m.userId || {};
      const uid = u._id ? u._id.toString() : u.toString();
      memberProfileMap.set(uid, {
        name: u.name || "Member",
        email: u.email || "",
        image: u.image || "",
        role: m.role || "MEMBER",
      });
    }

    const memberSummaries = Array.from(balancesMap.values()).map((summary) => {
      const profile = memberProfileMap.get(summary.userId) || {};
      return {
        ...summary,
        name: profile.name || "Member",
        email: profile.email || "",
        image: profile.image || "",
        role: profile.role || "MEMBER",
      };
    });

    const enrichedSuggestions = suggestedSettlements.map((s) => ({
      ...s,
      fromUser: memberProfileMap.get(s.fromUserId) || { name: "Member" },
      toUser: memberProfileMap.get(s.toUserId) || { name: "Member" },
    }));

    return NextResponse.json({
      members: memberSummaries,
      suggestedSettlements: enrichedSuggestions,
      totalExpensesCount: expenses.length,
      totalSettlementsCount: settlements.length,
    });
  } catch (error: any) {
    console.error("Error calculating balances:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate balances" },
      { status: 500 }
    );
  }
}
