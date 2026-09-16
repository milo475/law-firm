'use client';

import type { PerformanceByUser, PerformanceOverview, PerformancePeriod, PerformanceTimeline, PerformanceUserDetail } from '@law-firm/shared/schemas';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from './api';

export const PERIOD_OPTIONS: { value: PerformancePeriod; label: string }[] = [
  { value: 'this-month', label: 'Энэ сар' },
  { value: 'last-30-days', label: 'Сүүлийн 30 хоног' },
  { value: 'all-time', label: 'Бүх цаг' },
];
const DEFAULT_PERIOD: PerformancePeriod = 'this-month';

export function parsePeriod(value: string | null): PerformancePeriod {
  return PERIOD_OPTIONS.some((option) => option.value === value) ? (value as PerformancePeriod) : DEFAULT_PERIOD;
}

export const periodLabel = (period: PerformancePeriod) => PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? '';

/** "67%" or "—" when no completed task had a due date. */
export const formatRate = (rate: number | null) => (rate === null ? '—' : `${rate}%`);

export function usePerformanceOverview(period: PerformancePeriod, enabled = true) {
  return useQuery({
    queryKey: ['performance', 'overview', period],
    queryFn: () => api.get<PerformanceOverview>(`/performance/overview?period=${period}`),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function usePerformanceByUser(period: PerformancePeriod) {
  return useQuery({
    queryKey: ['performance', 'by-user', period],
    queryFn: () => api.get<PerformanceByUser>(`/performance/by-user?period=${period}`),
    placeholderData: keepPreviousData,
  });
}

export function usePerformanceTimeline(period: PerformancePeriod, userId?: string) {
  return useQuery({
    queryKey: ['performance', 'timeline', period, userId ?? 'scope'],
    queryFn: () => api.get<PerformanceTimeline>(`/performance/timeline?period=${period}${userId ? `&userId=${userId}` : ''}`),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function usePerformanceUser(userId: string, period: PerformancePeriod) {
  return useQuery({
    queryKey: ['performance', 'user', userId, period],
    queryFn: () => api.get<PerformanceUserDetail>(`/performance/user/${userId}?period=${period}`),
    placeholderData: keepPreviousData,
    retry: false,
  });
}
