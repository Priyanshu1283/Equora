"use client";

import React, { useState, useCallback, useEffect, createContext, useContext } from "react";
import { X, Bell, Receipt, HandCoins, UserPlus, CheckCircle, Trash2 } from "lucide-react";

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: string;
}

interface ToastContextValue {
  showToast: (n: ToastNotification) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

function getTypeIcon(type: string) {
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
      return <Bell className="h-4 w-4 text-slate-600" />;
  }
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className="flex items-start gap-3 w-80 bg-white rounded-xl border border-slate-200 shadow-lg p-3.5 animate-in slide-in-from-right-5 fade-in duration-300">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 border border-slate-200">
        {getTypeIcon(toast.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-900 truncate">{toast.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors mt-0.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = useCallback((n: ToastNotification) => {
    setToasts((prev) => {
      // Prevent exact duplicates
      if (prev.some((t) => t.id === n.id)) return prev;
      return [n, ...prev].slice(0, 5); // max 5 at once
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
