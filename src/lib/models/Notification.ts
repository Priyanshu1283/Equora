import mongoose, { Schema, Document, Model } from "mongoose";

export type NotificationType =
  | "INVITATION"
  | "EXPENSE_ADDED"
  | "SETTLEMENT_RECORDED"
  | "MEMBER_JOINED";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, maxlength: 100 },
    message: { type: String, required: true, maxlength: 300 },
    type: {
      type: String,
      enum: ["INVITATION", "EXPENSE_ADDED", "SETTLEMENT_RECORDED", "MEMBER_JOINED"],
      default: "EXPENSE_ADDED",
    },
    link: { type: String, default: "" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
