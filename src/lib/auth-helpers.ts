import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/connect";
import { GroupMember } from "@/lib/models/GroupMember";
import mongoose from "mongoose";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user || null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    throw new Error("Unauthorized: You must be signed in.");
  }
  return user;
}

export async function requireGroupMember(groupId: string, userId: string) {
  await connectToDatabase();
  const member = await GroupMember.findOne({
    groupId: new mongoose.Types.ObjectId(groupId),
    userId: new mongoose.Types.ObjectId(userId),
    status: "ACTIVE",
  });

  if (!member) {
    throw new Error("Forbidden: You are not an active member of this group.");
  }

  return member;
}

export async function requireGroupAdmin(groupId: string, userId: string) {
  const member = await requireGroupMember(groupId, userId);
  if (member.role !== "ADMIN") {
    throw new Error("Forbidden: Admin privileges required.");
  }
  return member;
}
