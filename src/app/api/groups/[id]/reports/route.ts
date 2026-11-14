import { NextResponse } from "next/server";
import { getCurrentUser, requireGroupMember } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Expense } from "@/lib/models/Expense";
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

    // 1. Category-wise breakdown
    const categoryBreakdown = await Expense.aggregate([
      { $match: { groupId: gid } },
      {
        $group: {
          _id: "$category",
          totalPaise: { $sum: "$amountPaise" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalPaise: -1 } },
    ]);

    // 2. Member-wise paid breakdown
    const memberPaidBreakdown = await Expense.aggregate([
      { $match: { groupId: gid } },
      {
        $group: {
          _id: "$paidBy",
          totalPaise: { $sum: "$amountPaise" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$_id",
          name: "$user.name",
          email: "$user.email",
          image: "$user.image",
          totalPaise: 1,
          count: 1,
        },
      },
      { $sort: { totalPaise: -1 } },
    ]);

    // 3. Monthly spending trends
    const monthlyTrends = await Expense.aggregate([
      { $match: { groupId: gid } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          totalPaise: { $sum: "$amountPaise" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const formattedTrends = monthlyTrends.map((t) => {
      const date = new Date(t._id.year, t._id.month - 1);
      const monthLabel = date.toLocaleString("en-US", { month: "short", year: "numeric" });
      return {
        month: monthLabel,
        totalPaise: t.totalPaise,
        totalRupees: t.totalPaise / 100,
        count: t.count,
      };
    });

    return NextResponse.json({
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c._id,
        totalPaise: c.totalPaise,
        totalRupees: c.totalPaise / 100,
        count: c.count,
      })),
      memberPaidBreakdown,
      monthlyTrends: formattedTrends,
    });
  } catch (error: any) {
    console.error("Error generating reports:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate reports" },
      { status: 500 }
    );
  }
}
