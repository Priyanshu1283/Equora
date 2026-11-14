import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISettlement extends Document {
  _id: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  paidBy: mongoose.Types.ObjectId; // Sender
  paidTo: mongoose.Types.ObjectId; // Receiver
  amountPaise: number; // Integer in paise
  date: Date;
  notes?: string;
  status: "CONFIRMED";
  createdAt: Date;
  updatedAt: Date;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    paidTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: "", maxlength: 250 },
    status: { type: String, enum: ["CONFIRMED"], default: "CONFIRMED" },
  },
  { timestamps: true }
);

SettlementSchema.index({ groupId: 1, date: -1 });
SettlementSchema.index({ paidBy: 1 });
SettlementSchema.index({ paidTo: 1 });

export const Settlement: Model<ISettlement> =
  mongoose.models.Settlement ||
  mongoose.model<ISettlement>("Settlement", SettlementSchema);
