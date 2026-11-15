"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useCallback } from "react";
import { getPusherClient } from "@/lib/pusher-client";
import type { Channel } from "pusher-js";

export interface NotificationItem {
  _id: string;
  userId: string;
  groupId?: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  totalCount: number;
  totalPages: number;
  page: number;
}

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function fetchNotifications(page = 1, filter = "all"): Promise<NotificationsResponse> {
  const res = await fetch(`/api/notifications?page=${page}&limit=15&filter=${filter}`);
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

async function fetchUnreadCount(): Promise<{ unreadCount: number }> {
  const res = await fetch("/api/notifications/unread");
  if (!res.ok) throw new Error("Failed to fetch unread count");
  return res.json();
}

// ─── Main Hook ────────────────────────────────────────────────────────────────

export function useNotifications(userId?: string, page = 1, filter = "all") {
  const qc = useQueryClient();
  const channelRef = useRef<Channel | null>(null);
  const toastRef = useRef<((n: NotificationItem) => void) | null>(null);

  // Main notification list query (30s polling fallback)
  const notificationsQuery = useQuery({
    queryKey: ["notifications", page, filter],
    queryFn: () => fetchNotifications(page, filter),
    refetchInterval: 30_000, // fallback polling
    enabled: !!userId,
  });

  // Unread count (lighter, faster)
  const unreadQuery = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
    enabled: !!userId,
  });

  // ── Pusher real-time subscription ──────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const pusher = getPusherClient();
    if (!pusher) return; // graceful fallback to polling

    const channelName = `private-user-${userId}`;

    // Prevent duplicate subscriptions
    if (channelRef.current) return;

    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    channel.bind("notification.created", (data: NotificationItem) => {
      // 1. Prepend new notification to cached list
      qc.setQueryData<NotificationsResponse>(["notifications", 1, "all"], (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: [data, ...old.notifications].slice(0, 15),
          unreadCount: old.unreadCount + 1,
          totalCount: old.totalCount + 1,
        };
      });

      // 2. Bump unread count
      qc.setQueryData<{ unreadCount: number }>(["notifications-unread"], (old) => ({
        unreadCount: (old?.unreadCount ?? 0) + 1,
      }));

      // 3. Show toast (if callback registered)
      if (toastRef.current) toastRef.current(data);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [userId, qc]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const markOneRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    },
    onMutate: async (id: string) => {
      // Optimistic update
      qc.setQueryData<NotificationsResponse>(["notifications", page, filter], (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((n) =>
            n._id === id ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, old.unreadCount - 1),
        };
      });
      qc.setQueryData<{ unreadCount: number }>(["notifications-unread"], (old) => ({
        unreadCount: Math.max(0, (old?.unreadCount ?? 0) - 1),
      }));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
    },
    onMutate: () => {
      // Optimistic update: zero out everything
      qc.setQueriesData<NotificationsResponse>(
        { queryKey: ["notifications"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) => ({ ...n, isRead: true })),
            unreadCount: 0,
          };
        }
      );
      qc.setQueryData(["notifications-unread"], { unreadCount: 0 });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    },
    onMutate: async (id: string) => {
      const deleted = notificationsQuery.data?.notifications.find((n) => n._id === id);
      qc.setQueryData<NotificationsResponse>(["notifications", page, filter], (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.filter((n) => n._id !== id),
          unreadCount: deleted && !deleted.isRead ? Math.max(0, old.unreadCount - 1) : old.unreadCount,
          totalCount: old.totalCount - 1,
        };
      });
      if (deleted && !deleted.isRead) {
        qc.setQueryData<{ unreadCount: number }>(["notifications-unread"], (old) => ({
          unreadCount: Math.max(0, (old?.unreadCount ?? 0) - 1),
        }));
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const setToastCallback = useCallback((cb: (n: NotificationItem) => void) => {
    toastRef.current = cb;
  }, []);

  return {
    notifications: notificationsQuery.data?.notifications ?? [],
    unreadCount:
      unreadQuery.data?.unreadCount ??
      notificationsQuery.data?.unreadCount ??
      0,
    totalPages: notificationsQuery.data?.totalPages ?? 1,
    totalCount: notificationsQuery.data?.totalCount ?? 0,
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    markOneRead: markOneRead.mutate,
    markAllRead: markAllRead.mutate,
    deleteNotification: deleteNotification.mutate,
    refetch: notificationsQuery.refetch,
    setToastCallback,
  };
}
