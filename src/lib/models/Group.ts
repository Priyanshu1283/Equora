import mongoose, { Schema, Document, Model } from "mongoose";

export type GroupType =
  | "ROOMMATES"
  | "FRIENDS"
  | "TRAVEL"
  | "FAMILY"
  | "OFFICE"
  | "OTHER";

export interface IGroup extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  groupType: GroupType;
  currency: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 250, default: "" },
    groupType: {
      type: String,
      enum: ["ROOMMATES", "FRIENDS", "TRAVEL", "FAMILY", "OFFICE", "OTHER"],
      default: "OTHER",
    },
    currency: { type: String, default: "INR" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

GroupSchema.index({ createdBy: 1 });

export const Group: Model<IGroup> =
  mongoose.models.Group || mongoose.model<IGroup>("Group", GroupSchema);
