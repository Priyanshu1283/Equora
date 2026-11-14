"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Users, Home, Plane, Heart, Briefcase, Tag } from "lucide-react";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (group: any) => void;
}

const groupTypes = [
  { id: "ROOMMATES", label: "Roommates", icon: Home },
  { id: "FRIENDS", label: "Friends", icon: Users },
  { id: "TRAVEL", label: "Travel / Trip", icon: Plane },
  { id: "FAMILY", label: "Family", icon: Heart },
  { id: "OFFICE", label: "Office / Team", icon: Briefcase },
  { id: "OTHER", label: "Other", icon: Tag },
];

export function CreateGroupModal({ isOpen, onClose, onCreated }: CreateGroupModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupType, setGroupType] = useState("OTHER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a group name.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          groupType,
          currency: "INR",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create group");
      }

      onClose();
      setName("");
      setDescription("");
      setGroupType("OTHER");

      if (onCreated) {
        onCreated(data.group);
      } else {
        router.push(`/groups/${data.group._id}`);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create a New Group"
      description="Organize shared expenses with roommates, trips, friends, or family."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <Input
          label="Group Name"
          placeholder="e.g. Goa Trip, Flat 402, Team Lunch"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="w-full space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
            Group Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {groupTypes.map((t) => {
              const Icon = t.icon;
              const isSelected = groupType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setGroupType(t.id)}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all text-left ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
            Description (Optional)
          </label>
          <textarea
            placeholder="Add notes or guidelines for this group..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
}
