import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { GroupMember } from "@/lib/models/GroupMember";
import { Expense } from "@/lib/models/Expense";
import { ExpenseSplit } from "@/lib/models/ExpenseSplit";
import { Settlement } from "@/lib/models/Settlement";
import {
  calculateGroupBalances,
  type ExpenseRecord,
  type SettlementRecord,
} from "@/lib/calculations/balance";
import mongoose from "mongoose";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const uid = new mongoose.Types.ObjectId(user.id);
    const uidStr = user.id;

    // 1. Fetch user's active groups
    const memberships = await GroupMember.find({
      userId: uid,
      status: "ACTIVE",
    })
      .populate("groupId", "name groupType currency")
      .lean();

    const joinedGroups = memberships
      .filter((m) => m.groupId != null)
      .map((m) => m.groupId as any);

    const groupIds = joinedGroups.map((g) => g._id);

    if (groupIds.length === 0) {
      return NextResponse.json({
        summary: {
          totalJoinedGroups: 0,
          overallTotalPaidPaise: 0,
          overallTotalSharePaise: 0,
          overallAmountToReceivePaise: 0,
          overallAmountToPayPaise: 0,
          netBalancePaise: 0,
        },
        groupBalances: [],
        recentExpenses: [],
      });
    }

    // 2. Fetch all data in PARALLEL using .lean() for maximum speed
    const [allMembers, allExpenses, allSplits, allSettlements, recentExpenses] =
      await Promise.all([
        GroupMember.find({
          groupId: { $in: groupIds },
          status: "ACTIVE",
        }).lean(),
        Expense.find({ groupId: { $in: groupIds } }).lean(),
        ExpenseSplit.find({ groupId: { $in: groupIds } }).lean(),
        Settlement.find({
          groupId: { $in: groupIds },
          status: "CONFIRMED",
        }).lean(),
        Expense.find({ groupId: { $in: groupIds } })
          .populate("groupId", "name")
          .populate("paidBy", "name email image")
          .sort({ date: -1, createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

    // 3. Index data in memory for O(1) access
    const membersByGroup: Record<string, string[]> = {};
    for (const m of allMembers) {
      const gid = m.groupId.toString();
      if (!membersByGroup[gid]) membersByGroup[gid] = [];
      membersByGroup[gid].push(m.userId.toString());
    }

    const splitsByExpense: Record<string, Array<{ userId: string; sharePaise: number }>> = {};
    for (const s of allSplits) {
      const eid = s.expenseId.toString();
      if (!splitsByExpense[eid]) splitsByExpense[eid] = [];
      splitsByExpense[eid].push({
        userId: s.userId.toString(),
        sharePaise: s.sharePaise,
      });
    }

    const expensesByGroup: Record<string, ExpenseRecord[]> = {};
    for (const e of allExpenses) {
      const gid = e.groupId.toString();
      if (!expensesByGroup[gid]) expensesByGroup[gid] = [];
      expensesByGroup[gid].push({
        _id: e._id.toString(),
        paidBy: e.paidBy.toString(),
        amountPaise: e.amountPaise,
        splits: splitsByExpense[e._id.toString()] || [],
      });
    }

    const settlementsByGroup: Record<string, SettlementRecord[]> = {};
    for (const s of allSettlements) {
      const gid = s.groupId.toString();
      if (!settlementsByGroup[gid]) settlementsByGroup[gid] = [];
      settlementsByGroup[gid].push({
        _id: s._id.toString(),
        paidBy: s.paidBy.toString(),
        paidTo: s.paidTo.toString(),
        amountPaise: s.amountPaise,
        status: s.status,
      });
    }

    // 4. Compute balances in-memory
    const groupBalances: Array<{
      groupId: string;
      groupName: string;
      groupType: string;
      totalPaidPaise: number;
      totalExpenseSharePaise: number;
      netBalancePaise: number;
      amountToReceivePaise: number;
      amountToPayPaise: number;
    }> = [];

    let overallTotalPaidPaise = 0;
    let overallTotalSharePaise = 0;
    let overallAmountToReceivePaise = 0;
    let overallAmountToPayPaise = 0;

    for (const group of joinedGroups) {
      const gidStr = group._id.toString();
      const memberIds = membersByGroup[gidStr] || [];
      const expList = expensesByGroup[gidStr] || [];
      const setList = settlementsByGroup[gidStr] || [];

      const balances = calculateGroupBalances(memberIds, expList, setList);
      const userSummary = balances.get(uidStr) || {
        userId: uidStr,
        totalPaidPaise: 0,
        totalExpenseSharePaise: 0,
        netBalancePaise: 0,
        amountToReceivePaise: 0,
        amountToPayPaise: 0,
      };

      overallTotalPaidPaise += userSummary.totalPaidPaise;
      overallTotalSharePaise += userSummary.totalExpenseSharePaise;
      overallAmountToReceivePaise += userSummary.amountToReceivePaise;
      overallAmountToPayPaise += userSummary.amountToPayPaise;

      groupBalances.push({
        groupId: gidStr,
        groupName: group.name,
        groupType: group.groupType,
        totalPaidPaise: userSummary.totalPaidPaise,
        totalExpenseSharePaise: userSummary.totalExpenseSharePaise,
        netBalancePaise: userSummary.netBalancePaise,
        amountToReceivePaise: userSummary.amountToReceivePaise,
        amountToPayPaise: userSummary.amountToPayPaise,
      });
    }

    return NextResponse.json({
      summary: {
        totalJoinedGroups: joinedGroups.length,
        overallTotalPaidPaise,
        overallTotalSharePaise,
        overallAmountToReceivePaise,
        overallAmountToPayPaise,
        netBalancePaise: overallTotalPaidPaise - overallTotalSharePaise,
      },
      groupBalances,
      recentExpenses,
    });
  } catch (error: any) {
    console.error("Error fetching user dashboard:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
