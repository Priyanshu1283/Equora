import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExpenseSplit extends Document {
  _id: mongoose.Types.ObjectId;
  expenseId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sharePaise: number; // Integer in paise
  isSettled: boolean;
  createdAt: Date;
}

const ExpenseSplitSchema = new Schema<IExpenseSplit>(
  {
    expenseId: { type: Schema.Types.ObjectId, ref: "Expense", required: true },
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sharePaise: { type: Number, required: true, min: 0 },
    isSettled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ExpenseSplitSchema.index({ expenseId: 1 });
ExpenseSplitSchema.index({ groupId: 1, userId: 1 });
ExpenseSplitSchema.index({ userId: 1 });

export const ExpenseSplit: Model<IExpenseSplit> =
  mongoose.models.ExpenseSplit ||
  mongoose.model<IExpenseSplit>("ExpenseSplit", ExpenseSplitSchema);
