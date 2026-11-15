import mongoose, { Schema, Document, Model } from "mongoose";

export type NotificationType =
  | "GROUP_INVITATION"
  | "INVITATION_ACCEPTED"
  | "MEMBER_JOINED"
  | "MEMBER_REMOVED"
  | "EXPENSE_ADDED"
  | "EXPENSE_UPDATED"
  | "EXPENSE_DELETED"
  | "SETTLEMENT_SUGGESTED"
  | "SETTLEMENT_RECORDED"
  | "SETTLEMENT_CONFIRMED"
  // legacy aliases kept for backward compat
  | "INVITATION"
  | "SETTLEMENT_RECORDED";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: mongoose.Types.ObjectId;
  eventKey?: string; // deduplication key
  link?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    groupId: { type: Schema.Types.ObjectId, ref: "Group", index: true },
    type: {
      type: String,
      enum: [
        "GROUP_INVITATION",
        "INVITATION_ACCEPTED",
        "MEMBER_JOINED",
        "MEMBER_REMOVED",
        "EXPENSE_ADDED",
        "EXPENSE_UPDATED",
        "EXPENSE_DELETED",
        "SETTLEMENT_SUGGESTED",
        "SETTLEMENT_RECORDED",
        "SETTLEMENT_CONFIRMED",
        // legacy
        "INVITATION",
      ],
      required: true,
    },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 400 },
    relatedId: { type: Schema.Types.ObjectId },
    eventKey: { type: String, sparse: true }, // unique per event, used for dedup
    link: { type: String, default: "" },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Compound indexes for fast queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ groupId: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
