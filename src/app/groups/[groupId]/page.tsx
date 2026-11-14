"use client";

import React, { useEffect, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { ExpenseModal } from "@/components/expenses/ExpenseModal";
import { SettlementModal } from "@/components/balances/SettlementModal";
import { InviteModal } from "@/components/groups/InviteModal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatPaiseToINR, getInitials } from "@/lib/utils";
import {
  PlusCircle,
  UserPlus,
  HandCoins,
  ListFilter,
  CheckCircle2,
  Trash2,
  Edit2,
  LogOut,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface GroupPageProps {
  params: Promise<{ groupId: string }>;
}

const COLORS = [
  "#059669",
  "#0284c7",
  "#7c3aed",
  "#d97706",
  "#e11d48",
  "#475569",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

export default function GroupDashboardPage({ params }: GroupPageProps) {
  const resolvedParams = use(params);
  const groupId = resolvedParams.groupId;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "overview" | "expenses" | "analytics" | "settlements" | "members"
  >("overview");

  const [groupData, setGroupData] = useState<any>(null);
  const [balanceData, setBalanceData] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters for expenses
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedMember, setSelectedMember] = useState("");

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<any | null>(null);

  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementPrefill, setSettlementPrefill] = useState<{
    payerId?: string;
    receiverId?: string;
    amountPaise?: number;
  }>({});

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Fast primary loader: only loads group info + balances
  const loadEssentialData = useCallback(async () => {
    try {
      const [grpRes, balRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/groups/${groupId}/balances`),
      ]);

      if (grpRes.status === 401 || grpRes.status === 403) {
        router.push("/dashboard");
        return;
      }

      const [grpJson, balJson] = await Promise.all([
        grpRes.json(),
        balRes.json(),
      ]);

      setGroupData(grpJson);
      setBalanceData(balJson);
    } catch (err) {
      console.error("Error loading group:", err);
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  // Lazy tab data loaders
  const loadExpenses = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses`);
      const json = await res.json();
      setExpenses(json.expenses || []);
    } catch (err) {
      console.error(err);
    }
  }, [groupId]);

  const loadSettlements = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/settlements`);
      const json = await res.json();
      setSettlements(json.settlements || []);
    } catch (err) {
      console.error(err);
    }
  }, [groupId]);

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/reports`);
      const json = await res.json();
      setReports(json);
    } catch (err) {
      console.error(err);
    }
  }, [groupId]);

  // Initial load
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => {
        if (!session?.user) {
          router.push("/login");
        } else {
          setCurrentUser(session.user);
          loadEssentialData();
          loadExpenses(); // Background prefetch
        }
      })
      .catch(() => router.push("/login"));
  }, [groupId, router, loadEssentialData, loadExpenses]);

  // Trigger tab-specific loads
  useEffect(() => {
    if (activeTab === "settlements" && settlements.length === 0) {
      loadSettlements();
    } else if (activeTab === "analytics" && !reports) {
      loadReports();
    }
  }, [activeTab, settlements.length, reports, loadSettlements, loadReports]);

  const refreshAll = () => {
    loadEssentialData();
    loadExpenses();
    if (activeTab === "settlements") loadSettlements();
    if (activeTab === "analytics") loadReports();
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses/${expenseId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        refreshAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveGroup = async () => {
    const userSummary = balanceData?.members?.find(
      (m: any) => m.userId === currentUser?.id
    );

    if (userSummary && userSummary.netBalancePaise !== 0) {
      alert(
        `Cannot leave group with an unsettled balance (${formatPaiseToINR(
          userSummary.netBalancePaise,
          true
        )}). Please settle all dues before leaving.`
      );
      return;
    }

    if (confirm("Are you sure you want to leave this group?")) {
      router.push("/dashboard");
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
          Loading group dashboard...
        </div>
      </div>
    );
  }

  const group = groupData?.group;
  const members = groupData?.members || [];
  const stats = groupData?.stats || { totalExpensePaise: 0, totalExpensesCount: 0 };
  const memberSummaries = balanceData?.members || [];
  const suggestedSettlements = balanceData?.suggestedSettlements || [];

  const filteredExpenses = expenses.filter((e) => {
    if (selectedCategory !== "ALL" && e.category !== selectedCategory) return false;
    if (selectedMember && e.paidBy?._id !== selectedMember) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Group Header Banner */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {group?.name}
              </h1>
              <Badge variant="neutral">{group?.groupType}</Badge>
            </div>
            {group?.description && (
              <p className="text-sm text-slate-500 max-w-xl">
                {group.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span>{members.length} Members</span>
              <span>•</span>
              <span>{stats.totalExpensesCount} Recorded Expenses</span>
              <span>•</span>
              <span>
                Total Spent:{" "}
                <strong className="text-slate-800 font-mono">
                  {formatPaiseToINR(stats.totalExpensePaise)}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsInviteModalOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Invite
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSettlementPrefill({});
                setIsSettlementModalOpen(true);
              }}
            >
              <HandCoins className="h-4 w-4 mr-1.5" />
              Settle Up
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setExpenseToEdit(null);
                setIsExpenseModalOpen(true);
              }}
            >
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6 overflow-x-auto text-sm font-semibold">
            {[
              { id: "overview", label: "Overview & Balances" },
              { id: "expenses", label: `Expenses (${expenses.length})` },
              { id: "analytics", label: "Analytics & Reports" },
              { id: "settlements", label: `Settlements (${settlements.length})` },
              { id: "members", label: `Members (${members.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-slate-900 text-slate-900 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* TAB 1: OVERVIEW & BALANCES */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Suggested Settlements (Minimal Cash Flow)
                  </h3>
                  <p className="text-xs text-slate-500">
                    The fewest number of payments required to settle all debts.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">
                  {suggestedSettlements.length} Pending
                </span>
              </div>

              {suggestedSettlements.length === 0 ? (
                <div className="rounded-xl bg-emerald-50/60 border border-emerald-200/70 p-5 text-center space-y-1">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                  <p className="text-sm font-semibold text-emerald-950">
                    Everyone is all settled up!
                  </p>
                  <p className="text-xs text-emerald-700">
                    No outstanding debts or pending balances in this group.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestedSettlements.map((s: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                          <span>{s.fromUser?.name}</span>
                          <span className="text-slate-400 font-normal">owes</span>
                          <span>{s.toUser?.name}</span>
                        </div>
                        <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
                          {formatPaiseToINR(s.amountPaise)}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="emerald"
                        onClick={() => {
                          setSettlementPrefill({
                            payerId: s.fromUserId,
                            receiverId: s.toUserId,
                            amountPaise: s.amountPaise,
                          });
                          setIsSettlementModalOpen(true);
                        }}
                      >
                        Record Pay
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Member Financial Summary
                </h3>
                <p className="text-xs text-slate-500">
                  Total amount paid, total expense share, and net balance for
                  each member.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Total Paid</th>
                      <th className="py-3 px-4">Total Share</th>
                      <th className="py-3 px-4">Net Balance</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {memberSummaries.map((m: any) => {
                      const isCreditor = m.netBalancePaise > 0;
                      const isDebtor = m.netBalancePaise < 0;

                      return (
                        <tr key={m.userId} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                              {getInitials(m.name)}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900">
                                {m.name}
                              </span>
                              {m.userId === currentUser?.id && (
                                <span className="ml-1 text-[10px] text-slate-400 font-normal">
                                  (You)
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                            {formatPaiseToINR(m.totalPaidPaise)}
                          </td>

                          <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                            {formatPaiseToINR(m.totalExpenseSharePaise)}
                          </td>

                          <td
                            className={`py-3 px-4 font-mono tabular-nums font-bold ${
                              isCreditor
                                ? "text-emerald-600"
                                : isDebtor
                                ? "text-rose-600"
                                : "text-slate-400"
                            }`}
                          >
                            {formatPaiseToINR(m.netBalancePaise, true)}
                          </td>

                          <td className="py-3 px-4">
                            {isCreditor && (
                              <Badge variant="emerald">
                                Receives {formatPaiseToINR(m.amountToReceivePaise)}
                              </Badge>
                            )}
                            {isDebtor && (
                              <Badge variant="rose">
                                Owes {formatPaiseToINR(m.amountToPayPaise)}
                              </Badge>
                            )}
                            {!isCreditor && !isDebtor && (
                              <Badge variant="neutral">Settled</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXPENSES */}
        {activeTab === "expenses" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <ListFilter className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Food & Dining">Food & Dining</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Rent">Rent</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Travel">Travel</option>
                  <option value="Medical">Medical</option>
                  <option value="Other">Other</option>
                </select>

                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">All Payers</option>
                  {members.map((m: any) => (
                    <option key={m.user._id} value={m.user._id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setExpenseToEdit(null);
                  setIsExpenseModalOpen(true);
                }}
              >
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Add Expense
              </Button>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
                No expenses match the selected filters.
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden shadow-xs">
                {filteredExpenses.map((exp: any) => (
                  <div
                    key={exp._id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          {exp.title}
                        </h4>
                        <Badge variant="neutral">{exp.category}</Badge>
                      </div>

                      <p className="text-xs text-slate-500">
                        Paid by <strong>{exp.paidBy?.name}</strong> on{" "}
                        {new Date(exp.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {exp.splits?.map((s: any) => (
                          <span
                            key={s._id}
                            className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                          >
                            <span>{s.userId?.name}</span>
                            <span className="text-slate-400 font-mono">
                              ({formatPaiseToINR(s.sharePaise)})
                            </span>
                          </span>
                        ))}
                      </div>

                      {exp.notes && (
                        <p className="text-xs text-slate-400 italic">
                          &quot;{exp.notes}&quot;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                          {formatPaiseToINR(exp.amountPaise)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setExpenseToEdit(exp);
                            setIsExpenseModalOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="Edit Expense"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp._id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ANALYTICS & REPORTS */}
        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                Category Breakdown
              </h3>
              {!reports || reports.categoryBreakdown?.length === 0 ? (
                <p className="text-xs text-slate-400">No expense data yet.</p>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reports.categoryBreakdown}
                        dataKey="totalRupees"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }: any) =>
                          `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                        }
                      >
                        {reports.categoryBreakdown.map((_: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`₹${val.toLocaleString("en-IN")}`, "Total"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                Monthly Spending Trend
              </h3>
              {!reports || reports.monthlyTrends?.length === 0 ? (
                <p className="text-xs text-slate-400">No monthly trends yet.</p>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reports.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" textAnchor="end" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any) => [`₹${val.toLocaleString("en-IN")}`, "Spent"]}
                      />
                      <Bar dataKey="totalRupees" fill="#0f172a" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SETTLEMENTS */}
        {activeTab === "settlements" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirmed Settlements Log
                </h3>
                <p className="text-xs text-slate-500">
                  Record of all manual repayments made between members.
                </p>
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSettlementPrefill({});
                  setIsSettlementModalOpen(true);
                }}
              >
                <HandCoins className="h-4 w-4 mr-1.5" />
                Record Settlement
              </Button>
            </div>

            {settlements.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
                No settlements recorded yet. When a member pays another, click
                &quot;Record Settlement&quot;.
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden shadow-xs">
                {settlements.map((set: any) => (
                  <div
                    key={set._id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <span>{set.paidBy?.name}</span>
                        <span className="text-slate-400 font-normal">paid</span>
                        <span>{set.paidTo?.name}</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {new Date(set.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        {set.notes && `• "${set.notes}"`}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-600 font-mono tabular-nums">
                        {formatPaiseToINR(set.amountPaise)}
                      </span>
                      <p className="text-[10px] text-emerald-700 font-semibold uppercase">
                        Confirmed
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MEMBERS & SETTINGS */}
        {activeTab === "members" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Group Members
                  </h3>
                  <p className="text-xs text-slate-500">
                    Active participants in this group.
                  </p>
                </div>
                <Button size="sm" onClick={() => setIsInviteModalOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Invite Member
                </Button>
              </div>

              <div className="divide-y divide-slate-100">
                {members.map((m: any) => (
                  <div
                    key={m._id}
                    className="py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                        {getInitials(m.user?.name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {m.user?.name}
                        </p>
                        <p className="text-xs text-slate-500">{m.user?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={m.role === "ADMIN" ? "amber" : "neutral"}
                      >
                        {m.role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-rose-950">
                  Leave this group
                </h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  You can only leave if your net balance in this group is exactly
                  ₹0.00.
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={handleLeaveGroup}>
                <LogOut className="h-4 w-4 mr-1.5" />
                Leave Group
              </Button>
            </div>
          </div>
        )}
      </main>

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        groupId={groupId}
        members={members}
        currentUserId={currentUser?.id}
        onSaved={refreshAll}
        expenseToEdit={expenseToEdit}
      />

      <SettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        groupId={groupId}
        members={members}
        initialPayerId={settlementPrefill.payerId}
        initialReceiverId={settlementPrefill.receiverId}
        initialAmountPaise={settlementPrefill.amountPaise}
        onSettled={refreshAll}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        groupId={groupId}
        groupName={group?.name || "Group"}
        onInvited={refreshAll}
      />
    </div>
  );
}
