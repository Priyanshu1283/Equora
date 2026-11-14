import mongoose, { Schema, Document, Model } from "mongoose";

export type MemberRole = "ADMIN" | "MEMBER";
export type MemberStatus = "ACTIVE" | "INACTIVE";

export interface IGroupMember extends Document {
  _id: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: Date;
}

const GroupMemberSchema = new Schema<IGroupMember>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["ADMIN", "MEMBER"], default: "MEMBER" },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

GroupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });
GroupMemberSchema.index({ userId: 1, status: 1 });

export const GroupMember: Model<IGroupMember> =
  mongoose.models.GroupMember ||
  mongoose.model<IGroupMember>("GroupMember", GroupMemberSchema);
