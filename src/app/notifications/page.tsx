"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Receipt,
  UserPlus,
  HandCoins,
  CheckCircle,
  Trash2,
  Sparkles,
  Check,
  ArrowLeft,
  Inbox,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

type Filter = "all" | "unread" | "read";

function getIcon(type: string) {
  switch (type) {
    case "GROUP_INVITATION":
    case "INVITATION":
      return <UserPlus className="h-4 w-4 text-indigo-600" />;
    case "EXPENSE_ADDED":
    case "EXPENSE_UPDATED":
      return <Receipt className="h-4 w-4 text-emerald-600" />;
    case "EXPENSE_DELETED":
      return <Trash2 className="h-4 w-4 text-red-500" />;
    case "SETTLEMENT_RECORDED":
    case "SETTLEMENT_CONFIRMED":
      return <HandCoins className="h-4 w-4 text-amber-600" />;
    case "INVITATION_ACCEPTED":
    case "MEMBER_JOINED":
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    default:
      return <Sparkles className="h-4 w-4 text-slate-500" />;
  }
}

function relativeTime(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-4 p-5 animate-pulse">
      <div className="h-10 w-10 rounded-xl bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-200 rounded w-full" />
        <div className="h-2 bg-slate-100 rounded w-1/4 mt-1" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = (session?.user as any)?.id as string | undefined;

  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const {
    notifications,
    unreadCount,
    totalPages,
    totalCount,
    isLoading,
    markOneRead,
    markAllRead,
    deleteNotification,
  } = useNotifications(userId, page, filter);

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
    { key: "read", label: "Read" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900">Notifications</h1>
              <p className="text-xs text-slate-500 mt-0.5">{totalCount} total</p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <NotificationSkeleton key={i} />)
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center">
              <Inbox className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">No notifications</p>
              <p className="text-xs text-slate-400 mt-1">
                {filter === "unread" ? "Nothing unread – you're all caught up!" : "Nothing here yet."}
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item._id}
                className={`group flex items-start gap-4 px-5 py-4 transition-colors ${
                  item.isRead ? "hover:bg-slate-50/80" : "bg-indigo-50/30 hover:bg-indigo-50/50"
                }`}
              >
                {/* Icon */}
                <div className="relative shrink-0 mt-0.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm">
                    {getIcon(item.type)}
                  </div>
                  {!item.isRead && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-indigo-500 border-2 border-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={item.link || "#"}
                    onClick={() => !item.isRead && markOneRead(item._id)}
                    className="block"
                  >
                    <p className={`text-sm leading-snug ${item.isRead ? "font-medium text-slate-700" : "font-bold text-slate-900"}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {item.message}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      {relativeTime(item.createdAt)}
                    </p>
                  </Link>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {!item.isRead && (
                    <button
                      onClick={() => markOneRead(item._id)}
                      title="Mark as read"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(item._id)}
                    title="Delete"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
