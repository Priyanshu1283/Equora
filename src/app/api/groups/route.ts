import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/db/connect";
import { Group } from "@/lib/models/Group";
import { GroupMember } from "@/lib/models/GroupMember";
import { createGroupSchema } from "@/lib/validations";
import mongoose from "mongoose";

// GET /api/groups - Get all groups for current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const memberships = await GroupMember.find({
      userId: new mongoose.Types.ObjectId(user.id),
      status: "ACTIVE",
    }).populate({
      path: "groupId",
      populate: { path: "createdBy", select: "name email image" },
    });

    const groups = memberships
      .filter((m) => m.groupId != null)
      .map((m) => {
        const grp = m.groupId as any;
        return {
          _id: grp._id,
          name: grp.name,
          description: grp.description,
          groupType: grp.groupType,
          currency: grp.currency,
          role: m.role,
          createdBy: grp.createdBy,
          createdAt: grp.createdAt,
        };
      });

    return NextResponse.json({ groups });
  } catch (error: any) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

// POST /api/groups - Create a new group
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createGroupSchema.parse(body);

    await connectToDatabase();

    // Create group
    const newGroup = await Group.create({
      ...validatedData,
      createdBy: new mongoose.Types.ObjectId(user.id),
    });

    // Creator is automatically the ADMIN member
    await GroupMember.create({
      groupId: newGroup._id,
      userId: new mongoose.Types.ObjectId(user.id),
      role: "ADMIN",
      status: "ACTIVE",
    });

    return NextResponse.json({ group: newGroup }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating group:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create group" },
      { status: 400 }
    );
  }
}
