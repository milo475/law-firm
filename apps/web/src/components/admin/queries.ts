'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api, type CaseMemberItem, type Paginated } from '@/lib/api';
import type { AdminUser } from '@/lib/admin';
import { ROLE_LABELS } from '@/lib/format';
import { shortName } from '@/lib/utils';

/** Active clients as Select options (a LAWYER may list clients too). */
export function useClientOptions(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'users', { role: 'CLIENT', isActive: true }],
    queryFn: () => api.get<Paginated<AdminUser>>('/users?role=CLIENT&isActive=true&limit=100'),
    enabled,
    select: (data) =>
      data.items.map((u) => ({ value: u.id, label: `${shortName(u.firstName, u.lastName)} · ${u.email}` })),
  });
}

/** Active lawyers as Select options (ADMIN only — the API rejects LAWYER for this list). */
export function useLawyerOptions(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'users', { role: 'LAWYER', isActive: true }],
    queryFn: () => api.get<Paginated<AdminUser>>('/users?role=LAWYER&isActive=true&limit=100'),
    enabled,
    select: (data) => data.items.map((u) => ({ value: u.id, label: shortName(u.firstName, u.lastName) })),
  });
}

/** Active lawyers and admins as Select options (ADMIN only — assigning tasks to any staff member). */
export function useStaffOptions(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'users', { role: 'STAFF', isActive: true }],
    queryFn: async () => {
      const [lawyers, admins] = await Promise.all([
        api.get<Paginated<AdminUser>>('/users?role=LAWYER&isActive=true&limit=100'),
        api.get<Paginated<AdminUser>>('/users?role=ADMIN&isActive=true&limit=100'),
      ]);
      return [...lawyers.items, ...admins.items];
    },
    enabled,
    select: (users) => users.map((u) => ({ value: u.id, label: `${shortName(u.firstName, u.lastName)} · ${ROLE_LABELS[u.role]}` })),
  });
}

export const caseMembersKey = (caseId: string) => ['admin', 'case', caseId, 'members'] as const;

/** The case team (LEAD first); nested under the case key, so useInvalidateCase refreshes it. */
export function useCaseMembers(caseId: string, enabled = true) {
  return useQuery({
    queryKey: caseMembersKey(caseId),
    queryFn: () => api.get<CaseMemberItem[]>(`/cases/${caseId}/members`),
    enabled,
  });
}

/** Invalidates everything that shows data of one case (detail, timeline, documents, invoices, lists, stats). */
export function useInvalidateCase(caseId: string) {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'case', caseId] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'cases'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      queryClient.invalidateQueries({ queryKey: ['document-requests', 'summary'] }),
    ]);
  }, [caseId, queryClient]);
}
