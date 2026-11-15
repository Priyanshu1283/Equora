import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash?: string;
  image?: string;
  defaultCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    image: { type: String, default: "" },
    defaultCurrency: { type: String, default: "INR" },
  },
  { timestamps: true }
);

const registeredUserModel = mongoose.models.User;
if (registeredUserModel && !registeredUserModel.schema.path("passwordHash")) {
  mongoose.deleteModel("User");
}

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
