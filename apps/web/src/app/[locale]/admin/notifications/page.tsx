'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { NotificationRow, groupByDay } from '@/components/notifications/notification-row';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';
import { notificationListKey, useNotificationActions, useUnreadNotificationCount, type NotificationFilter, type NotificationPage } from '@/lib/notifications';

const PAGE_SIZE = 20;
const EMPTY: Record<NotificationFilter, { title: string; description: string }> = {
  all: { title: 'Мэдэгдэл алга', description: 'Танд даалгавар оноогдох, хэргийн багт нэмэгдэх, мессеж эсвэл баримт ирэхэд энд харагдана.' },
  unread: { title: 'Уншаагүй мэдэгдэл алга', description: 'Бүх мэдэгдлээ уншсан байна.' },
  read: { title: 'Уншсан мэдэгдэл алга', description: 'Нээж үзсэн мэдэгдэл энд харагдана.' },
};

export default function AdminNotificationsPage() {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const unread = useUnreadNotificationCount();
  const { markRead, markAll } = useNotificationActions();
  const list = useInfiniteQuery({
    queryKey: notificationListKey(`page:${filter}`),
    queryFn: ({ pageParam }) =>
      api.get<NotificationPage>(`/notifications?limit=${PAGE_SIZE}&filter=${filter}${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

  const count = unread.data?.count ?? 0;
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const groups = groupByDay(items);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageTitle
        title="Мэдэгдэл"
        description={unread.isLoading ? 'Ачааллаж байна…' : count > 0 ? `${count} уншаагүй мэдэгдэл байна` : 'Уншаагүй мэдэгдэл байхгүй'}
        actions={
          <Button
            variant="secondary"
            size="md"
            disabled={count === 0 || markAll.isPending}
            onClick={() =>
              markAll.mutate(undefined, {
                onSuccess: (result) => toast.success('Бүгдийг уншсан болголоо', `${result.updated} мэдэгдэл`),
                onError: (error) => toast.danger('Алдаа гарлаа', error instanceof ApiError ? error.message : undefined),
              })
            }
          >
            Бүгдийг уншсан болгох
          </Button>
        }
      />

      <Tabs value={filter} onValueChange={(value) => setFilter(value as NotificationFilter)}>
        <TabsList aria-label="Мэдэгдэл шүүх">
          <TabsTrigger value="all">Бүгд</TabsTrigger>
          <TabsTrigger value="unread">Уншаагүй{count > 0 ? ` (${count})` : ''}</TabsTrigger>
          <TabsTrigger value="read">Уншсан</TabsTrigger>
        </TabsList>
      </Tabs>

      {list.isError ? (
        <ErrorState message={list.error instanceof ApiError ? list.error.message : 'Мэдэгдэл ачаалахад алдаа гарлаа'} onRetry={() => void list.refetch()} />
      ) : list.isLoading ? (
        <div className="flex flex-col gap-3" aria-busy aria-label="Ачааллаж байна">
          <Skeleton className="h-5 w-24" />
          <div className="overflow-hidden rounded-lg border border-border-default bg-bg-surface">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 border-b border-border-subtle px-6 py-5 last:border-b-0">
                <Skeleton className="size-10 shrink-0 rounded-md" />
                <div className="flex flex-1 flex-col gap-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3.5 w-3/4" /></div>
              </div>
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={EMPTY[filter].title} description={EMPTY[filter].description} />
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label} className="flex flex-col gap-3">
              <h3 className="text-body-sm-medium text-text-muted">{group.label}</h3>
              <ul className="overflow-hidden rounded-lg border border-border-default bg-bg-surface">
                {group.items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    linkPrefix="/admin"
                    showActor
                    onRead={() => markRead.mutate(item.id)}
                    pending={markRead.isPending && markRead.variables === item.id}
                  />
                ))}
              </ul>
            </section>
          ))}
          {list.hasNextPage && (
            <div className="flex justify-center">
              <Button variant="secondary" size="md" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
                {list.isFetchingNextPage ? 'Ачааллаж байна…' : 'Цааш үзэх'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
