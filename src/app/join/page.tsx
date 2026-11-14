"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Wallet, Users, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

function JoinGroupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invitation token found in the URL.");
      setLoading(false);
      return;
    }

    fetch(`/api/invitations/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvitation(data.invitation);
        }
      })
      .catch((err) => setError(err.message || "Failed to load invitation"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;
    setJoining(true);
    setError("");

    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?callbackUrl=/join?token=${token}`);
          return;
        }
        throw new Error(data.error || "Failed to join group");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/groups/${data.groupId}`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to join group.");
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <svg className="animate-spin h-5 w-5 text-slate-900" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          Loading invitation details...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <Users className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Group Invitation
          </h1>
          <p className="text-xs text-slate-500">
            You&apos;ve been invited to collaborate on shared expenses.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to proceed</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {invitation && !success && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Group Name
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                {invitation.groupId?.name}
              </h2>
              {invitation.groupId?.description && (
                <p className="text-xs text-slate-600">
                  {invitation.groupId.description}
                </p>
              )}
              <div className="pt-2 text-xs text-slate-500">
                Invited by: <strong>{invitation.invitedBy?.name}</strong>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              isLoading={joining}
              onClick={handleJoin}
            >
              Accept & Join Group
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-emerald-950">
              Welcome to the Group!
            </h3>
            <p className="text-xs text-emerald-700">
              Redirecting you to the group dashboard...
            </p>
          </div>
        )}

        <div className="text-center pt-2">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            Go to My Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function JoinGroupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <p className="text-xs text-slate-500">Loading...</p>
        </div>
      }
    >
      <JoinGroupContent />
    </Suspense>
  );
}
