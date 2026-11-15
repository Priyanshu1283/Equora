import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Notification } from "@/lib/models/Notification";
import mongoose from "mongoose";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const uid = new mongoose.Types.ObjectId(user.id);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: uid })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Notification.countDocuments({ userId: uid, isRead: false }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    await connectToDatabase();
    const uid = new mongoose.Types.ObjectId(user.id);

    if (body.all) {
      await Notification.updateMany({ userId: uid, isRead: false }, { isRead: true });
    } else if (body.notificationId) {
      await Notification.updateOne(
        { _id: new mongoose.Types.ObjectId(body.notificationId), userId: uid },
        { isRead: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update notification" },
      { status: 400 }
    );
  }
}
