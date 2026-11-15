"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Mail, Copy, Check, Send } from "lucide-react";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onInvited?: () => void;
}

export function InviteModal({
  isOpen,
  onClose,
  groupId,
  groupName,
  onInvited,
}: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/groups/${groupId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create invitation");
      }

      const fullLink = `${window.location.origin}${data.inviteLink}`;
      setInviteLink(fullLink);
      setEmailSent(data.emailSent === true);
      setEmail("");
      if (onInvited) onInvited();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setInviteLink("");
    setEmailSent(null);
    setError("");
    setEmail("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Invite to "${groupName}"`}
      description="Send an email invite or share an invitation link directly."
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        {!inviteLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Member Email"
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                <Send className="h-4 w-4 mr-1.5" />
                Generate Invite
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-950">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                {emailSent ? "Invitation emailed!" : "Invitation link ready"}
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                {emailSent
                  ? `An invitation email was sent. You can also share this link to join ${groupName}:`
                  : `Email delivery is not configured or failed. Share this link directly to join ${groupName}:`}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono select-all focus:outline-none"
                />
                <Button size="sm" variant="emerald" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
