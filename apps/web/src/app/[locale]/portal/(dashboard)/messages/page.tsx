// Figma: 02 Client Portal / Portal / 08 Messages — inbox: one conversation per case (latest message, unread count).
// Opening a row goes to that case's messages tab, where the chat itself lives.
'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { MessagesIcon } from '@/components/icons';
import { useUser } from '@/components/portal/user-context';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { ApiError, api, type CaseListItem, type MessageConversation, type Paginated, type PublicUser } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { MESSAGE_CONVERSATIONS_KEY } from '@/lib/messages';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { cn, initials, shortName } from '@/lib/utils';

interface InboxRow {
  caseId: string;
  caseNumber: string;
  title: string;
  lawyer: PublicUser;
  lastMessage: MessageConversation['lastMessage'];
  unreadCount: number;
}

export default function MessagesPage() {
  const t = useTranslations('portal.messages');
  const locale = useLocale() as Locale;
  const { user } = useUser();
  const conversations = useQuery({
    queryKey: MESSAGE_CONVERSATIONS_KEY,
    queryFn: () => api.get<MessageConversation[]>('/messages/conversations'),
    refetchInterval: 30_000,
  });
  const cases = useQuery({ queryKey: ['cases', 'all'], queryFn: () => api.get<Paginated<CaseListItem>>('/cases?limit=50') });

  const withMessages = conversations.data ?? [];
  const rows: InboxRow[] = [
    ...withMessages.map((item) => ({
      caseId: item.id,
      caseNumber: item.caseNumber,
      title: item.title,
      lawyer: item.lawyer,
      lastMessage: item.lastMessage,
      unreadCount: item.unreadCount,
    })),
    // Open cases without messages yet, so the client can start a conversation.
    ...(cases.data?.items ?? [])
      .filter((item) => item.status !== 'CLOSED' && !withMessages.some((conversation) => conversation.id === item.id))
      .map((item) => ({ caseId: item.id, caseNumber: item.caseNumber, title: item.title, lawyer: item.lawyer, lastMessage: null, unreadCount: 0 })),
  ];
  const unread = rows.reduce((sum, row) => sum + row.unreadCount, 0);
  const error = conversations.error ?? cases.error;
  const loading = conversations.isLoading || cases.isLoading;

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="-mx-5 -mt-6 flex flex-col gap-1.5 bg-bg-surface px-5 py-4 md:mx-0 md:mt-0 md:gap-2 md:bg-transparent md:p-0">
        <h2 className="hidden text-h2 md:block">{t('title')}</h2>
        <p className="text-body-sm text-text-secondary md:text-body">
          {loading ? t('loading') : unread > 0 ? t('unreadSummary', { count: unread }) : t('noUnread')}
        </p>
      </div>

      {error ? (
        <ErrorState
          message={error instanceof ApiError ? error.message : t('loadError')}
          onRetry={() => {
            void conversations.refetch();
            void cases.refetch();
          }}
        />
      ) : loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<MessagesIcon size={24} />}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      ) : (
        <section aria-labelledby="conversations-heading" className="overflow-hidden rounded-lg border border-border-default bg-bg-surface">
          <h3 id="conversations-heading" className="border-b border-border-default px-5 py-4 text-h4 md:px-6">{t('conversations')}</h3>
          <ul className="divide-y divide-border-default">
            {rows.map((row) => {
              const last = row.lastMessage;
              const own = last?.sender.id === user.id;
              return (
                <li key={row.caseId}>
                  <Link
                    href={`/portal/cases/${row.caseId}?tab=messages`}
                    className="focus-ring flex items-start gap-3.5 px-5 py-4 transition-colors hover:bg-bg-surface-alt md:px-6"
                  >
                    <Avatar size="md" initials={initials(row.lawyer.firstName, row.lawyer.lastName)} src={row.lawyer.avatarUrl} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 truncate text-body-medium text-text-primary">
                          {shortName(row.lawyer.firstName, row.lawyer.lastName)}
                          <span className="text-body-sm text-text-muted"> · {row.caseNumber}</span>
                        </p>
                        {last && <span className="shrink-0 text-caption text-text-muted">{whenLabel(last.createdAt, locale)}</span>}
                      </div>
                      <p className="truncate text-caption text-text-secondary">{row.title}</p>
                      <div className="flex items-center justify-between gap-3">
                        <p className={cn('min-w-0 truncate text-body-sm', row.unreadCount > 0 ? 'text-body-sm-medium text-text-primary' : 'text-text-muted')}>
                          {last
                            ? t('preview', { sender: own ? t('you') : shortName(last.sender.firstName, last.sender.lastName), body: last.body })
                            : t('noMessagesYet')}
                        </p>
                        {row.unreadCount > 0 && (
                          <span
                            className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-accent-default px-2 py-[3px] text-caption text-text-on-accent"
                            aria-label={t('unreadCount', { count: row.unreadCount })}
                          >
                            {row.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Today → "14:05", otherwise the date. */
function whenLabel(iso: string, locale: Locale): string {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  return formatDate(iso, locale);
}
