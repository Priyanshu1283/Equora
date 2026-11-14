"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { rupeesToPaise, formatPaiseToINR, getInitials } from "@/lib/utils";
import { calculateEqualSplit } from "@/lib/calculations/split";
import {
  Utensils,
  ShoppingCart,
  Home,
  Zap,
  Car,
  ShoppingBag,
  Film,
  Building,
  Plane,
  HeartPulse,
  Tag,
  Check,
  Users as UsersIcon,
  UserCheck,
} from "lucide-react";

interface Member {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  members: Member[];
  currentUserId?: string;
  onSaved: () => void;
  expenseToEdit?: any | null;
}

const categories = [
  { name: "Food & Dining", icon: Utensils },
  { name: "Groceries", icon: ShoppingCart },
  { name: "Rent", icon: Home },
  { name: "Electricity", icon: Zap },
  { name: "Transportation", icon: Car },
  { name: "Shopping", icon: ShoppingBag },
  { name: "Entertainment", icon: Film },
  { name: "Accommodation", icon: Building },
  { name: "Travel", icon: Plane },
  { name: "Medical", icon: HeartPulse },
  { name: "Other", icon: Tag },
];

export function ExpenseModal({
  isOpen,
  onClose,
  groupId,
  members,
  currentUserId,
  onSaved,
  expenseToEdit,
}: ExpenseModalProps) {
  const [title, setTitle] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [category, setCategory] = useState("Food & Dining");
  const [paidBy, setPaidBy] = useState(currentUserId || members[0]?.user?._id || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Participant selection: "ALL" | "CUSTOM"
  const [selectionMode, setSelectionMode] = useState<"ALL" | "CUSTOM">("ALL");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reset form when modal opens or expenseToEdit changes
  useEffect(() => {
    if (expenseToEdit) {
      setTitle(expenseToEdit.title);
      setAmountRupees((expenseToEdit.amountPaise / 100).toString());
      setCategory(expenseToEdit.category || "Other");
      setPaidBy(expenseToEdit.paidBy?._id || expenseToEdit.paidBy);
      setDate(new Date(expenseToEdit.date).toISOString().split("T")[0]);
      setNotes(expenseToEdit.notes || "");

      const participantIds = expenseToEdit.splits?.map((s: any) =>
        s.userId?._id ? s.userId._id.toString() : s.userId.toString()
      ) || [];

      setSelectedUserIds(participantIds);
      if (participantIds.length === members.length && members.length > 0) {
        setSelectionMode("ALL");
      } else {
        setSelectionMode("CUSTOM");
      }
    } else {
      setTitle("");
      setAmountRupees("");
      setCategory("Food & Dining");
      setPaidBy(currentUserId || members[0]?.user?._id || "");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setSelectionMode("ALL");
      setSelectedUserIds(members.map((m) => m.user._id));
    }
    setError("");
  }, [isOpen, expenseToEdit, members, currentUserId]);

  // Update selectedUserIds if in "ALL" mode
  useEffect(() => {
    if (selectionMode === "ALL") {
      setSelectedUserIds(members.map((m) => m.user._id));
    }
  }, [selectionMode, members]);

  // Toggle custom participant
  const toggleParticipant = (userId: string) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const selectAll = () => {
    setSelectedUserIds(members.map((m) => m.user._id));
  };

  // Live preview calculation
  const parsedPaise = rupeesToPaise(amountRupees);
  let previewSplits: any[] = [];
  try {
    if (parsedPaise > 0 && selectedUserIds.length > 0) {
      previewSplits = calculateEqualSplit(parsedPaise, selectedUserIds);
    }
  } catch (err) {
    // Ignore invalid math during typing
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter an expense title.");
      return;
    }

    const amountPaise = rupeesToPaise(amountRupees);
    if (amountPaise <= 0) {
      setError("Please enter a valid amount greater than ₹0.");
      return;
    }

    if (selectedUserIds.length === 0) {
      setError("At least one participant must be selected.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const url = expenseToEdit
        ? `/api/groups/${groupId}/expenses/${expenseToEdit._id}`
        : `/api/groups/${groupId}/expenses`;

      const method = expenseToEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          title: title.trim(),
          amountPaise,
          category,
          paidBy,
          date,
          notes: notes.trim(),
          participantUserIds: selectedUserIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save expense");
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expenseToEdit ? "Edit Expense" : "Add an Expense"}
      description="Record a shared group expense with precise equal splitting."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        {/* Title and Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Expense Title"
              placeholder="e.g. Dinner at Smoke House Deli"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              label="Amount (₹)"
              placeholder="1000"
              type="number"
              step="0.01"
              min="0.01"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Paid By and Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="w-full space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
              Paid By
            </label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {members.map((m) => (
                <option key={m.user._id} value={m.user._id}>
                  {m.user.name} {m.user._id === currentUserId ? "(You)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Input
              label="Expense Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
            Category
          </label>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const Icon = c.icon;
              const isSelected = category === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setCategory(c.name)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Participant Selection */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Split Between
              </span>
              <p className="text-xs text-slate-500">
                Choose who shares this expense.
              </p>
            </div>

            {/* Mode switch */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setSelectionMode("ALL")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${
                  selectionMode === "ALL"
                    ? "bg-slate-900 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UsersIcon className="h-3 w-3" />
                All ({members.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectionMode("CUSTOM")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${
                  selectionMode === "CUSTOM"
                    ? "bg-slate-900 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserCheck className="h-3 w-3" />
                Custom ({selectedUserIds.length})
              </button>
            </div>
          </div>

          {/* Member chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {members.map((m) => {
              const isSelected = selectedUserIds.includes(m.user._id);
              const preview = previewSplits.find((s) => s.userId === m.user._id);

              return (
                <button
                  key={m.user._id}
                  type="button"
                  disabled={selectionMode === "ALL"}
                  onClick={() => toggleParticipant(m.user._id)}
                  className={`flex items-center gap-2 rounded-xl border p-2 text-xs transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-medium"
                      : "border-slate-200 bg-white text-slate-400 opacity-60"
                  } ${selectionMode === "ALL" ? "cursor-default" : "cursor-pointer hover:border-emerald-300"}`}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white">
                    {getInitials(m.user.name)}
                  </div>
                  <span>{m.user.name}</span>

                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  )}

                  {preview && (
                    <span className="ml-1 rounded bg-emerald-100/80 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800 tabular-nums">
                      {formatPaiseToINR(preview.sharePaise)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectionMode === "CUSTOM" && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-500">
                Selected {selectedUserIds.length} of {members.length} members
              </span>
              <button
                type="button"
                onClick={selectAll}
                className="text-slate-900 font-semibold hover:underline"
              >
                Select All
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
            Notes / Remarks (Optional)
          </label>
          <input
            placeholder="Add any additional details or receipts info..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            {parsedPaise > 0 && selectedUserIds.length > 0 && (
              <span>
                Equal split:{" "}
                <strong className="text-slate-900 font-mono">
                  {formatPaiseToINR(parsedPaise)}
                </strong>{" "}
                across {selectedUserIds.length} members.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {expenseToEdit ? "Update Expense" : "Save Expense"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
