'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api, type NotificationItem } from './api';
import { formatDate } from './format';

export type NotificationFilter = 'all' | 'unread' | 'read';

/** GET /notifications */
export interface NotificationPage {
  items: NotificationItem[];
  unreadCount: number;
  nextCursor: string | null;
}

/** Every notification query lives under this prefix (the portal list uses the bare key). */
const NOTIFICATIONS_KEY = ['notifications'] as const;
const NOTIFICATION_UNREAD_KEY = ['notifications', 'unread-count'] as const;
export const notificationListKey = (scope: string) => ['notifications', 'list', scope] as const;

/** Bell badge: polled every 30 seconds and on window focus (no websockets). */
export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: NOTIFICATION_UNREAD_KEY,
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useNotificationActions() {
  const queryClient = useQueryClient();
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }), [queryClient]);
  const markRead = useMutation({
    mutationFn: (id: string) => api.patch<NotificationItem>(`/notifications/${id}/read`),
    onSuccess: () => void refresh(),
  });
  const markAll = useMutation({
    mutationFn: () => api.patch<{ updated: number }>('/notifications/read-all'),
    onSuccess: () => void refresh(),
  });
  return { markRead, markAll };
}

/** Same wording as the portal dashboard: "Дөнгөж сая", "5 минутын өмнө", "3 цагийн өмнө", "Өчигдөр", "4 хоногийн өмнө", then the date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Дөнгөж сая';
  if (minutes < 60) return `${minutes} минутын өмнө`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Өчигдөр';
  if (days < 30) return `${days} хоногийн өмнө`;
  return formatDate(iso);
}
