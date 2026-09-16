'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type Paginated, type ServiceRequestItem, type ServiceRequestSummary } from './api';

/** Every service request query starts with this key, so one invalidation refreshes lists, details and badges. */
export const SERVICE_REQUESTS_KEY = ['service-requests'] as const;
const SERVICE_REQUEST_SUMMARY_KEY = ['service-requests', 'summary'] as const;
export const serviceRequestKey = (id: string) => ['service-requests', 'detail', id] as const;

/** NEW and ACCEPTED counts for the admin sidebar and dashboard (ADMIN only). */
export function useServiceRequestSummary(enabled = true) {
  return useQuery({
    queryKey: SERVICE_REQUEST_SUMMARY_KEY,
    queryFn: () => api.get<ServiceRequestSummary>('/service-requests/summary'),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/** The signed-in client's requests, newest first. */
export function useMyServiceRequests(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['service-requests', 'mine', { page, limit }],
    queryFn: () => api.get<Paginated<ServiceRequestItem>>(`/service-requests/mine?page=${page}&limit=${limit}`),
  });
}

/** Still waiting for a decision (NEW) or for a lawyer (ACCEPTED). */
export const isOpenServiceRequest = (request: Pick<ServiceRequestItem, 'status'>) => request.status === 'NEW' || request.status === 'ACCEPTED';
