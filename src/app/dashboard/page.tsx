"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatPaiseToINR, formatDate, getInitials } from "@/lib/utils";
import {
  Wallet,
  Users,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  Receipt,
  CheckCircle,
  Layers,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch("/api/user/dashboard");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch session user
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => {
        if (!session?.user) {
          router.push("/login");
        } else {
          setUser(session.user);
          loadData();
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

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
          Loading your financial overview...
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    overallTotalPaidPaise: 0,
    overallTotalSharePaise: 0,
    overallAmountToReceivePaise: 0,
    overallAmountToPayPaise: 0,
    netBalancePaise: 0,
    totalJoinedGroups: 0,
  };

  const groupBalances = data?.groupBalances || [];
  const recentExpenses = data?.recentExpenses || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} onOpenCreateGroup={() => setCreateModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome & Top Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Personal Financial Overview
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Consolidated balances and expenses across all your active groups.
            </p>
          </div>

          <Button onClick={() => setCreateModalOpen(true)} className="self-start sm:self-auto">
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Create Group
          </Button>
        </div>

        {/* 4 Clean Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net Position Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Overall Net Balance</span>
              <Wallet className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3">
              <span
                className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums font-mono ${
                  summary.netBalancePaise > 0
                    ? "text-emerald-600"
                    : summary.netBalancePaise < 0
                    ? "text-rose-600"
                    : "text-slate-900"
                }`}
              >
                {formatPaiseToINR(summary.netBalancePaise, true)}
              </span>
              <p className="text-xs text-slate-400 mt-1">
                {summary.netBalancePaise > 0
                  ? "You are owed money overall"
                  : summary.netBalancePaise < 0
                  ? "You owe money overall"
                  : "All settled up!"}
              </p>
            </div>
          </div>

          {/* You are Owed (Receivable) */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-emerald-800">
              <span>You are Owed</span>
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-700 tabular-nums font-mono">
                {formatPaiseToINR(summary.overallAmountToReceivePaise)}
              </span>
              <p className="text-xs text-emerald-600 mt-1">
                To receive from group members
              </p>
            </div>
          </div>

          {/* You Owe (Payable) */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-amber-800">
              <span>You Owe</span>
              <ArrowUpRight className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-700 tabular-nums font-mono">
                {formatPaiseToINR(summary.overallAmountToPayPaise)}
              </span>
              <p className="text-xs text-amber-600 mt-1">
                To pay back to members
              </p>
            </div>
          </div>

          {/* Total Paid Across Groups */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Total Paid by You</span>
              <Receipt className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums font-mono">
                {formatPaiseToINR(summary.overallTotalPaidPaise)}
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Your share was {formatPaiseToINR(summary.overallTotalSharePaise)}
              </p>
            </div>
          </div>
        </div>

        {/* Section: Your Groups */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Groups</h2>
              <p className="text-xs text-slate-500">
                Click a group to access its independent dashboard, expenses, and
                settlement matrix.
              </p>
            </div>
            <Link
              href="/groups"
              className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {groupBalances.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                No groups created yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create a group for your apartment, trip, or dinner to start
                recording and splitting shared expenses.
              </p>
              <Button onClick={() => setCreateModalOpen(true)} className="mt-2">
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Create First Group
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupBalances.map((g: any) => {
                const isCreditor = g.netBalancePaise > 0;
                const isDebtor = g.netBalancePaise < 0;

                return (
                  <Link
                    key={g.groupId}
                    href={`/groups/${g.groupId}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-950 line-clamp-1">
                          {g.groupName}
                        </h3>
                        <Badge variant="neutral">{g.groupType}</Badge>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Your Net Balance:</span>
                        <span
                          className={`font-bold font-mono tabular-nums text-sm ${
                            isCreditor
                              ? "text-emerald-600"
                              : isDebtor
                              ? "text-rose-600"
                              : "text-slate-500"
                          }`}
                        >
                          {isCreditor && `You get ${formatPaiseToINR(g.amountToReceivePaise)}`}
                          {isDebtor && `You owe ${formatPaiseToINR(g.amountToPayPaise)}`}
                          {!isCreditor && !isDebtor && "Settled up"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-slate-900 pt-2 border-t border-slate-50">
                      <span>Open Group</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Section: Recent Expenses Across Groups */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Recent Expenses
              </h2>
              <p className="text-xs text-slate-500">
                Transactions recently added across all your groups.
              </p>
            </div>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
              No recent expenses found. Add an expense from any group dashboard.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs divide-y divide-slate-100">
              {recentExpenses.map((exp: any) => (
                <div
                  key={exp._id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                      {exp.category?.slice(0, 2).toUpperCase() || "EX"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {exp.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        In{" "}
                        <strong className="text-slate-700">
                          {exp.groupId?.name}
                        </strong>{" "}
                        • Paid by {exp.paidBy?.name}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                      {formatPaiseToINR(exp.amountPaise)}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {new Date(exp.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateGroupModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => loadData()}
      />
    </div>
  );
}
