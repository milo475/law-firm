'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type FirmSettings } from './api';

export const FIRM_SETTINGS_KEY = ['settings', 'firm'] as const;

/** Firm details for client components (portal, admin). The endpoint is public, so it also works before sign-in. */
export function useFirmSettings() {
  return useQuery({
    queryKey: FIRM_SETTINGS_KEY,
    queryFn: () => api.get<FirmSettings>('/settings/firm'),
    staleTime: 5 * 60_000,
  });
}

/** Drops the server-rendered copy of the firm details; the route only does it for an ADMIN session. */
export async function revalidatePublicFirmSettings(): Promise<boolean> {
  try {
    const res = await fetch('/api/revalidate/firm', { method: 'POST', credentials: 'same-origin' });
    return res.ok;
  } catch {
    return false;
  }
}
