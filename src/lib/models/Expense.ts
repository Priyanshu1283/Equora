import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  title: string;
  amountPaise: number; // Integer in paise
  category: string;
  paidBy: mongoose.Types.ObjectId; // User who paid
  date: Date;
  notes?: string;
  splitType: "EQUAL" | "EXACT" | "PERCENT";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    amountPaise: { type: Number, required: true, min: 1 },
    category: {
      type: String,
      required: true,
      default: "Other",
    },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: "", maxlength: 500 },
    splitType: {
      type: String,
      enum: ["EQUAL", "EXACT", "PERCENT"],
      default: "EQUAL",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ groupId: 1, date: -1 });
ExpenseSchema.index({ paidBy: 1 });

export const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
