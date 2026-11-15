import { z } from "zod";

export const registerUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().email("Enter a valid email address").max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be no more than 72 characters")
    .refine(
      (password) => new TextEncoder().encode(password).length <= 72,
      "Password must be no more than 72 bytes"
    ),
});

export const GroupTypeEnum = z.enum([
  "ROOMMATES",
  "FRIENDS",
  "TRAVEL",
  "FAMILY",
  "OFFICE",
  "OTHER",
]);

export const ExpenseCategoryEnum = z.enum([
  "Food & Dining",
  "Groceries",
  "Rent",
  "Electricity",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Accommodation",
  "Travel",
  "Medical",
  "Other",
]);

// Group schemas
export const createGroupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters").max(60),
  description: z.string().max(250).optional(),
  groupType: GroupTypeEnum.default("OTHER"),
  currency: z.string().default("INR"),
});

export const updateGroupSchema = createGroupSchema.partial();

// Member invite schemas
export const inviteMemberSchema = z.object({
  groupId: z.string().min(1, "Group ID is required"),
  email: z.string().email("Invalid email address"),
});

// Expense schemas
export const createExpenseSchema = z.object({
  groupId: z.string().min(1, "Group ID is required"),
  title: z.string().min(2, "Expense title must be at least 2 characters").max(100),
  amountPaise: z.number().int().positive("Amount must be greater than zero"),
  category: ExpenseCategoryEnum.default("Other"),
  paidBy: z.string().min(1, "Payer ID is required"),
  date: z.string().or(z.date()).default(() => new Date()),
  notes: z.string().max(500).optional(),
  participantUserIds: z
    .array(z.string())
    .min(1, "At least one participant is required"),
});

export const updateExpenseSchema = createExpenseSchema.partial();

// Settlement schemas
export const recordSettlementSchema = z.object({
  groupId: z.string().min(1, "Group ID is required"),
  paidBy: z.string().min(1, "Sender is required"),
  paidTo: z.string().min(1, "Receiver is required"),
  amountPaise: z.number().int().positive("Amount must be greater than zero"),
  date: z.string().or(z.date()).default(() => new Date()),
  notes: z.string().max(250).optional(),
});
