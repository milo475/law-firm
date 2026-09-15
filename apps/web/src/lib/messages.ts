'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type MessageItem, type MessageUnreadSummary } from './api';

export const MESSAGE_UNREAD_SUMMARY_KEY = ['messages', 'unread-summary'] as const;
export const MESSAGE_CONVERSATIONS_KEY = ['messages', 'conversations'] as const;
export const caseMessagesKey = (caseId: string) => ['case-messages', caseId] as const;
/** Nested under caseMessagesKey, so invalidating the thread refreshes the count too. */
export const caseUnreadKey = (caseId: string) => ['case-messages', caseId, 'unread'] as const;

/** Mirrors the API: a CLIENT reads what the staff wrote, the assigned LAWYER reads the client's messages, ADMIN only views. */
export function isUnreadFor(message: Pick<MessageItem, 'readAt' | 'sender'>, viewer: { id: string; role: string }): boolean {
  if (message.readAt) return false;
  if (viewer.role === 'CLIENT') return message.sender.id !== viewer.id;
  if (viewer.role === 'LAWYER') return message.sender.role === 'CLIENT';
  return false;
}

/** Unread messages across the viewer's cases (sidebar badge, dashboard card). */
export function useMessageUnreadSummary(enabled = true) {
  return useQuery({
    queryKey: MESSAGE_UNREAD_SUMMARY_KEY,
    queryFn: () => api.get<MessageUnreadSummary>('/messages/unread-summary'),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/** Unread messages on one case (tab badge). */
export function useCaseUnreadCount(caseId: string, enabled = true) {
  return useQuery({
    queryKey: caseUnreadKey(caseId),
    queryFn: () => api.get<{ count: number }>(`/cases/${caseId}/messages/unread-count`),
    enabled,
    refetchInterval: 30_000,
  });
}
