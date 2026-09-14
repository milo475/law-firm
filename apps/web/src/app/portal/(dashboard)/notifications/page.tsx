'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { ApiError, api, type NotificationItem } from '@/lib/api';
import { formatDate } from '@/lib/format';

export default function NotificationsPage() {
  const [data, setData] = useState<{ items: NotificationItem[]; unreadCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<{ items: NotificationItem[]; unreadCount: number }>('/notifications')
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Алдаа гарлаа'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    load();
  }

  async function markAll() {
    await api.patch('/notifications/read-all');
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl">Мэдэгдэл</h1>
          <p className="mt-1 text-sm text-slate-600">{data ? `${data.unreadCount} уншаагүй мэдэгдэл` : ''}</p>
        </div>
        {data && data.unreadCount > 0 && (
          <button type="button" onClick={() => void markAll()} className="text-sm text-brand-500 hover:underline">
            Бүгдийг уншсан болгох
          </button>
        )}
      </div>
      {error ? (
        <ErrorState message={error} />
      ) : !data ? (
        <LoadingState />
      ) : data.items.length === 0 ? (
        <EmptyState message="Мэдэгдэл байхгүй байна." />
      ) : (
        <ul className="divide-y divide-brand-100 rounded-lg border border-brand-100 bg-white">
          {data.items.map((n) => (
            <li key={n.id} className={`flex flex-wrap items-start justify-between gap-3 px-4 py-3 ${n.isRead ? '' : 'bg-brand-50/70'}`}>
              <div>
                <p className={`text-sm ${n.isRead ? 'text-slate-700' : 'font-medium text-brand-900'}`}>{n.title}</p>
                <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(n.createdAt, true)}</p>
              </div>
              <div className="flex gap-3 text-xs">
                {n.link && <Link href={n.link} className="text-brand-500 hover:underline">Нээх</Link>}
                {!n.isRead && (
                  <button type="button" onClick={() => void markRead(n.id)} className="text-slate-500 hover:underline">
                    Уншсан
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
