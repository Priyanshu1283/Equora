import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Notification } from "@/lib/models/Notification";
import mongoose from "mongoose";

// GET /api/notifications?page=1&limit=15&filter=all|unread|read
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const uid = new mongoose.Types.ObjectId(user.id);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "15"));
    const filter = searchParams.get("filter") || "all"; // all | unread | read

    const query: Record<string, unknown> = { userId: uid };
    if (filter === "unread") query.isRead = false;
    if (filter === "read") query.isRead = true;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId: uid, isRead: false }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      page,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}

// PATCH /api/notifications  { all: true }  — mark all as read
export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const uid = new mongoose.Types.ObjectId(user.id);
    await Notification.updateMany({ userId: uid, isRead: false }, { isRead: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 400 });
  }
}
