import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Notification } from "@/lib/models/Notification";
import mongoose from "mongoose";

// GET /api/notifications/unread — fast unread count only
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const count = await Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(user.id),
      isRead: false,
    });

    return NextResponse.json({ unreadCount: count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
