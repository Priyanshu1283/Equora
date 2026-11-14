"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { rupeesToPaise, formatPaiseToINR } from "@/lib/utils";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface Member {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
}

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  members: Member[];
  initialPayerId?: string;
  initialReceiverId?: string;
  initialAmountPaise?: number;
  onSettled: () => void;
}

export function SettlementModal({
  isOpen,
  onClose,
  groupId,
  members,
  initialPayerId,
  initialReceiverId,
  initialAmountPaise,
  onSettled,
}: SettlementModalProps) {
  const [payerId, setPayerId] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      const defaultPayer =
        initialPayerId || (members[0]?.user?._id ?? "");
      const defaultReceiver =
        initialReceiverId || (members[1]?.user?._id ?? "");

      setPayerId(defaultPayer);
      setReceiverId(defaultReceiver);
      setAmountRupees(
        initialAmountPaise ? (initialAmountPaise / 100).toString() : ""
      );
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setError("");
    }
  }, [isOpen, initialPayerId, initialReceiverId, initialAmountPaise, members]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payerId === receiverId) {
      setError("Sender and receiver cannot be the same member.");
      return;
    }

    const amountPaise = rupeesToPaise(amountRupees);
    if (amountPaise <= 0) {
      setError("Please enter a valid amount greater than ₹0.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/groups/${groupId}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          paidBy: payerId,
          paidTo: receiverId,
          amountPaise,
          date,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record settlement");
      }

      onSettled();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to record settlement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const payerName =
    members.find((m) => m.user._id === payerId)?.user?.name || "Sender";
  const receiverName =
    members.find((m) => m.user._id === receiverId)?.user?.name || "Receiver";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record a Settlement"
      description="Record a direct payment made between members (UPI, Cash, Bank Transfer)."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        {/* Sender -> Receiver Visual Card */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-center w-5/12">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Who Paid?
            </span>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {members.map((m) => (
                <option key={m.user._id} value={m.user._id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col items-center justify-center px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white shadow-xs">
              <ArrowRight className="h-4 w-4" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 font-medium">Paid</span>
          </div>

          <div className="text-center w-5/12">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              To Whom?
            </span>
            <select
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {members.map((m) => (
                <option key={m.user._id} value={m.user._id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Settlement Amount (₹)"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="500"
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
            required
          />

          <Input
            label="Payment Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Notes */}
        <Input
          label="Payment Reference / Notes"
          placeholder="e.g. Paid via Google Pay / UPI Ref #12345"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Informative reassurance */}
        <div className="rounded-lg bg-emerald-50/70 border border-emerald-200/80 p-3 flex items-start gap-2.5 text-xs text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p>
            Recording this payment will immediately update the outstanding
            balance between <strong>{payerName}</strong> and{" "}
            <strong>{receiverName}</strong>.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="emerald" isLoading={isSubmitting}>
            Confirm Settlement
          </Button>
        </div>
      </form>
    </Modal>
  );
}
