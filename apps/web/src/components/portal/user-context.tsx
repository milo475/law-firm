'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError, api, type CurrentUser } from '@/lib/api';

interface UserContextValue {
  user: CurrentUser;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}

/**
 * Loads the current user via /auth/me (the api client silently refreshes on 401).
 * If that fails the visitor is sent to the login page.
 */
export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUser(await api.get<CurrentUser>('/auth/me'));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        const next = `${window.location.pathname}${window.location.search}`;
        router.replace(`/portal/login?next=${encodeURIComponent(next)}`);
        return;
      }
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      router.replace('/portal/login');
      router.refresh();
    }
  }, [router]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!user) {
    return <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">Ачааллаж байна…</div>;
  }

  return <UserContext.Provider value={{ user, refresh: load, logout }}>{children}</UserContext.Provider>;
}
