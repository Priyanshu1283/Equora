import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Notification } from "@/lib/models/Notification";
import mongoose from "mongoose";

// PATCH /api/notifications/read-all
export async function PATCH() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    await Notification.updateMany(
      { userId: new mongoose.Types.ObjectId(user.id), isRead: false },
      { isRead: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
