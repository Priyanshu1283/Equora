import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Notification } from "@/lib/models/Notification";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/notifications/[id]  — mark one as read
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    await Notification.updateOne(
      { _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(user.id) },
      { isRead: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/notifications/[id]
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const result = await Notification.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(user.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
