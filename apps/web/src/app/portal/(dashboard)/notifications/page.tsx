'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type NotificationItem } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type Data = { items: NotificationItem[]; unreadCount: number };

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['notifications'], queryFn: () => api.get<Data>('/notifications') });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (e) => toast.danger('Алдаа гарлаа', e instanceof ApiError ? e.message : undefined),
  });
  const markAll = useMutation({
    mutationFn: () => api.patch<{ updated: number }>('/notifications/read-all'),
    onSuccess: (r) => { toast.success('Бүгдийг уншсан болголоо', `${r.updated} мэдэгдэл`); void queryClient.invalidateQueries({ queryKey: ['notifications'] }); },
    onError: (e) => toast.danger('Алдаа гарлаа', e instanceof ApiError ? e.message : undefined),
  });

  const items = query.data?.items ?? [];
  const unread = query.data?.unreadCount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-h3">Мэдэгдэл</h2>
          <p className="mt-1 text-body-sm text-text-secondary">{query.data ? `${unread} уншаагүй · нийт ${items.length}` : 'Хэргийн явц, төлбөр, баримтын мэдэгдлүүд.'}</p>
        </div>
        <Button variant="secondary" size="sm" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()}>Бүгдийг уншсан болгох</Button>
      </div>

      {query.isError ? (
        <ErrorState message={query.error instanceof ApiError ? query.error.message : 'Алдаа гарлаа'} onRetry={() => void query.refetch()} />
      ) : query.isLoading ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : items.length === 0 ? (
        <EmptyState title="Мэдэгдэл байхгүй байна" description="Хэргийн явц, нэхэмжлэх, баримттай холбоотой мэдэгдэл энд харагдана." />
      ) : (
        <ul className="divide-y divide-border-default overflow-hidden rounded-lg border border-border-default bg-bg-surface">
          {items.map((n) => (
            <li key={n.id} className={cn('flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between', !n.isRead && 'bg-bg-brand-soft/60')}>
              <div className="flex min-w-0 gap-3">
                <span aria-hidden className={cn('mt-2 size-2 shrink-0 rounded-full', n.isRead ? 'bg-border-default' : 'bg-accent-default')} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className={cn('text-body-sm', n.isRead ? 'text-text-secondary' : 'text-body-sm-medium text-text-primary')}>
                    {n.title}{!n.isRead && <span className="sr-only"> (уншаагүй)</span>}
                  </p>
                  <p className="text-body-sm text-text-secondary">{n.body}</p>
                  <p className="text-caption text-text-muted">{formatDate(n.createdAt, true)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 md:pl-4">
                {n.link && n.link.startsWith('/portal') && <Button asChild variant="ghost" size="sm"><Link href={n.link}>Нээх</Link></Button>}
                {!n.isRead && <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)} disabled={markRead.isPending}>Уншсан</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
