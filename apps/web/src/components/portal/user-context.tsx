'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect } from 'react';
import { Skeleton } from '@/components/ui/states';
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

/** Loads /auth/me (the api client refreshes on 401); redirects to login when the session is gone. */
export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<CurrentUser>('/auth/me'),
    retry: false,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (query.error instanceof ApiError && (query.error.status === 401 || query.error.status === 403)) {
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/portal/login?next=${encodeURIComponent(next)}`);
    }
  }, [query.error, router]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['me'] });
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      queryClient.clear();
      router.replace('/portal/login');
      router.refresh();
    }
  }, [queryClient, router]);

  if (query.isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-body-sm text-status-danger-fg" role="alert">
        {query.error instanceof ApiError && query.error.status !== 401 ? query.error.message : 'Нэвтрэх хуудас руу шилжүүлж байна…'}
      </div>
    );
  }
  if (!query.data) {
    return (
      <div className="flex min-h-screen" aria-busy aria-label="Ачааллаж байна">
        <div className="hidden w-[260px] bg-bg-inverse md:block" />
        <div className="flex flex-1 flex-col gap-6 p-8">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return <UserContext.Provider value={{ user: query.data, refresh, logout }}>{children}</UserContext.Provider>;
}
