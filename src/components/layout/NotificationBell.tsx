"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Bell,
  Check,
  Receipt,
  UserPlus,
  HandCoins,
  Sparkles,
  CheckCircle,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { useNotifications, NotificationItem } from "@/hooks/useNotifications";
import { useToast } from "@/components/ui/Toast";
import { formatDistanceToNow } from "date-fns";

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

export function NotificationBell() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id as string | undefined;

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const { notifications, unreadCount, markOneRead, markAllRead, setToastCallback } =
    useNotifications(userId, 1, "all");

  // Wire up Pusher toast callback
  useEffect(() => {
    setToastCallback((n: NotificationItem) => {
      showToast({
        id: n._id,
        title: n.title,
        message: n.message,
        type: n.type,
      });
    });
  }, [setToastCallback, showToast]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const preview = notifications.slice(0, 8);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none"
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-sm animate-in zoom-in duration-150">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 border border-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[22rem] overflow-y-auto divide-y divide-slate-100">
            {preview.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">All caught up!</p>
              </div>
            ) : (
              preview.map((item) => (
                <Link
                  key={item._id}
                  href={item.link || "#"}
                  onClick={() => {
                    if (!item.isRead) markOneRead(item._id);
                    setIsOpen(false);
                  }}
                  className={`flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                    item.isRead
                      ? "hover:bg-slate-50"
                      : "bg-indigo-50/40 hover:bg-indigo-50/70"
                  }`}
                >
                  {/* Unread dot */}
                  <div className="relative shrink-0 mt-0.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm">
                      {getIcon(item.type)}
                    </div>
                    {!item.isRead && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-indigo-500 border-2 border-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs truncate leading-snug ${item.isRead ? "font-medium text-slate-700" : "font-bold text-slate-900"}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
                        {relativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/60">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              View all notifications
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
