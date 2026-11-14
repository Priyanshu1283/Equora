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
    }).populate("groupId", "name groupType currency");

    const joinedGroups = memberships
      .filter((m) => m.groupId != null)
      .map((m) => m.groupId as any);

    const groupIds = joinedGroups.map((g) => g._id);

    // 2. Compute group-wise balances
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
      const gid = group._id;

      // Group members
      const grpMembers = await GroupMember.find({
        groupId: gid,
        status: "ACTIVE",
      });
      const memberIds = grpMembers.map((m) => m.userId.toString());

      // Group expenses & splits
      const grpExpenses = await Expense.find({ groupId: gid });
      const expIds = grpExpenses.map((e) => e._id);
      const grpSplits = await ExpenseSplit.find({ expenseId: { $in: expIds } });

      const splitsMap: Record<string, Array<{ userId: string; sharePaise: number }>> = {};
      for (const s of grpSplits) {
        const eid = s.expenseId.toString();
        if (!splitsMap[eid]) splitsMap[eid] = [];
        splitsMap[eid].push({
          userId: s.userId.toString(),
          sharePaise: s.sharePaise,
        });
      }

      const expenseRecords: ExpenseRecord[] = grpExpenses.map((e) => ({
        _id: e._id.toString(),
        paidBy: e.paidBy.toString(),
        amountPaise: e.amountPaise,
        splits: splitsMap[e._id.toString()] || [],
      }));

      // Group settlements
      const grpSettlements = await Settlement.find({
        groupId: gid,
        status: "CONFIRMED",
      });
      const settlementRecords: SettlementRecord[] = grpSettlements.map((s) => ({
        _id: s._id.toString(),
        paidBy: s.paidBy.toString(),
        paidTo: s.paidTo.toString(),
        amountPaise: s.amountPaise,
        status: s.status,
      }));

      const balances = calculateGroupBalances(
        memberIds,
        expenseRecords,
        settlementRecords
      );

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
        groupId: gid.toString(),
        groupName: group.name,
        groupType: group.groupType,
        totalPaidPaise: userSummary.totalPaidPaise,
        totalExpenseSharePaise: userSummary.totalExpenseSharePaise,
        netBalancePaise: userSummary.netBalancePaise,
        amountToReceivePaise: userSummary.amountToReceivePaise,
        amountToPayPaise: userSummary.amountToPayPaise,
      });
    }

    // 3. Fetch recent expenses across user's groups
    const recentExpenses = await Expense.find({
      groupId: { $in: groupIds },
    })
      .populate("groupId", "name")
      .populate("paidBy", "name email image")
      .sort({ date: -1, createdAt: -1 })
      .limit(10);

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
