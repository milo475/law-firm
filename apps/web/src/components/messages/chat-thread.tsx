'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MESSAGE_BODY_MAX, SendMessageSchema } from '@law-firm/shared/schemas';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { MessagesIcon, SendIcon } from '@/components/icons';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type MessageItem, type MessagePage, type PublicUser } from '@/lib/api';
import { ROLE_LABELS, formatDate } from '@/lib/format';
import type { Locale } from '@/i18n/routing';
import { MESSAGE_CONVERSATIONS_KEY, MESSAGE_UNREAD_SUMMARY_KEY, caseMessagesKey, isUnreadFor } from '@/lib/messages';
import { cn, initials, shortName } from '@/lib/utils';

type SendValues = z.infer<typeof SendMessageSchema>;

const PAGE_SIZE = 30;
/** Poll while the chat tab is open; no WebSocket in the first version. */
const POLL_MS = 10_000;

interface ChatViewer {
  id: string;
  role: PublicUser['role'];
}

interface ChatCounterpart {
  name: string;
  roleLabel: string;
  initials: string;
  avatarUrl?: string | null;
}

/**
 * Chat copy. The client portal is localized and passes translations; the admin panel keeps these Mongolian defaults.
 */
export interface ChatLabels {
  section: string;
  loadError: string;
  loading: string;
  loadingMore: string;
  emptyTitle: string;
  olderMessages: string;
  messages: string;
  composerLabel: string;
  composerPlaceholder: string;
  send: string;
  sending: string;
  hint: string;
  sendFailed: string;
  tryAgain: string;
  you: string;
  read: string;
  today: string;
  yesterday: string;
}

const DEFAULT_LABELS: ChatLabels = {
  section: 'Мессеж',
  loadError: 'Мессеж ачаалахад алдаа гарлаа',
  loading: 'Ачааллаж байна',
  loadingMore: 'Ачааллаж байна…',
  emptyTitle: 'Харилцаа эхлүүлэх',
  olderMessages: 'Өмнөх мессежүүд',
  messages: 'Мессежүүд',
  composerLabel: 'Мессеж бичих',
  composerPlaceholder: 'Мессеж бичих…',
  send: 'Илгээх',
  sending: 'Илгээж байна…',
  hint: 'Enter илгээнэ · Shift+Enter шинэ мөр',
  sendFailed: 'Мессеж илгээж чадсангүй',
  tryAgain: 'Дахин оролдоно уу.',
  you: 'Та',
  read: 'Уншсан',
  today: 'Өнөөдөр',
  yesterday: 'Өчигдөр',
};

/** Case chat used by both the admin case page and the client portal case page. */
export function ChatThread({ caseId, viewer, active, counterpart, emptyDescription, className, labels, locale = 'mn', roleLabel = (role: string) => ROLE_LABELS[role] ?? role }: {
  caseId: string;
  viewer: ChatViewer;
  /** True while the tab is visible: enables polling and marking messages read. */
  active: boolean;
  counterpart?: ChatCounterpart | null;
  emptyDescription: string;
  className?: string;
  labels?: Partial<ChatLabels>;
  locale?: Locale;
  roleLabel?: (role: string) => string;
}) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const queryClient = useQueryClient();
  const scroller = useRef<HTMLDivElement>(null);
  const heightBeforeOlder = useRef<number | null>(null);
  const lastMarkedKey = useRef('');

  const thread = useInfiniteQuery({
    queryKey: caseMessagesKey(caseId),
    queryFn: ({ pageParam }) =>
      api.get<MessagePage>(`/cases/${caseId}/messages?limit=${PAGE_SIZE}${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: active ? POLL_MS : false,
  });

  // Pages arrive newest first; show oldest → newest and drop duplicates if a poll shifted the pages.
  const messages = useMemo(() => {
    const byId = new Map<string, MessageItem>();
    for (const page of thread.data?.pages ?? []) for (const item of page.items) byId.set(item.id, item);
    return [...byId.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [thread.data]);

  // Mark the other side's messages read once per new batch while the tab is open.
  const unreadKey = messages.filter((message) => isUnreadFor(message, viewer)).map((message) => message.id).join(',');
  const { mutate: markRead } = useMutation({
    mutationFn: () => api.post<{ updated: number }>(`/cases/${caseId}/messages/read`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: caseMessagesKey(caseId) });
      void queryClient.invalidateQueries({ queryKey: MESSAGE_UNREAD_SUMMARY_KEY });
      void queryClient.invalidateQueries({ queryKey: MESSAGE_CONVERSATIONS_KEY });
    },
  });
  useEffect(() => {
    if (!active || !unreadKey || lastMarkedKey.current === unreadKey) return;
    lastMarkedKey.current = unreadKey;
    markRead();
  }, [active, unreadKey, markRead]);

  // Keep the reading position when older messages are prepended; jump to the bottom when a new one arrives.
  const lastId = messages[messages.length - 1]?.id;
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element || heightBeforeOlder.current === null) return;
    element.scrollTop += element.scrollHeight - heightBeforeOlder.current;
    heightBeforeOlder.current = null;
  }, [messages.length]);
  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [lastId]);

  function loadOlder() {
    heightBeforeOlder.current = scroller.current?.scrollHeight ?? null;
    void thread.fetchNextPage();
  }

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<SendValues>({
    resolver: zodResolver(SendMessageSchema),
    defaultValues: { body: '' },
  });
  const body = watch('body') ?? '';
  const send = useMutation({
    mutationFn: (values: SendValues) => api.post<MessageItem>(`/cases/${caseId}/messages`, values),
    onSuccess: async () => {
      reset({ body: '' });
      await queryClient.invalidateQueries({ queryKey: caseMessagesKey(caseId) });
      void queryClient.invalidateQueries({ queryKey: MESSAGE_CONVERSATIONS_KEY });
    },
    onError: (error) => toast.danger(l.sendFailed, error instanceof ApiError ? error.message : l.tryAgain),
  });
  const submit = handleSubmit((values) => send.mutate(values));

  return (
    <section
      aria-label={l.section}
      className={cn(
        'flex h-[min(680px,calc(100dvh-240px))] min-h-[460px] flex-col overflow-hidden rounded-lg border border-border-default bg-bg-surface',
        className,
      )}
    >
      {counterpart && (
        <header className="flex items-center gap-3 border-b border-border-default px-4 py-3 md:px-6">
          <Avatar size="sm" initials={counterpart.initials} src={counterpart.avatarUrl} />
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-body-sm-medium text-text-primary">{counterpart.name}</p>
            <p className="text-caption text-text-muted">{counterpart.roleLabel}</p>
          </div>
        </header>
      )}

      <div ref={scroller} className="flex flex-1 flex-col overflow-y-auto bg-bg-page px-4 py-4 md:px-6" aria-busy={thread.isLoading}>
        {thread.isError ? (
          <ErrorState className="my-auto" message={thread.error instanceof ApiError ? thread.error.message : l.loadError} onRetry={() => void thread.refetch()} />
        ) : thread.isLoading ? (
          <div className="flex flex-col gap-4" aria-label={l.loading}>
            <Skeleton className="h-14 w-2/3" />
            <Skeleton className="ml-auto h-12 w-1/2" />
            <Skeleton className="h-16 w-3/5" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState className="my-auto" icon={<MessagesIcon size={24} />} title={l.emptyTitle} description={emptyDescription} />
        ) : (
          <>
            {thread.hasNextPage && (
              <div className="flex justify-center pb-3">
                <Button variant="ghost" size="sm" onClick={loadOlder} disabled={thread.isFetchingNextPage}>
                  {thread.isFetchingNextPage ? l.loadingMore : l.olderMessages}
                </Button>
              </div>
            )}
            <ol aria-label={l.messages} aria-live="polite" className="flex flex-col gap-3">
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const newDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
                const own = message.sender.id === viewer.id;
                const continued = !newDay && previous?.sender.id === message.sender.id;
                return (
                  <li key={message.id} className="flex flex-col gap-3">
                    {newDay && <p className="self-center rounded-full bg-bg-surface px-3 py-1 text-caption text-text-muted">{dayLabel(message.createdAt, l, locale)}</p>}
                    <MessageBubble message={message} own={own} showSender={!own && !continued} labels={l} roleLabel={roleLabel} />
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>

      <form onSubmit={submit} noValidate className="flex items-start gap-2.5 border-t border-border-default bg-bg-surface px-4 pb-2 pt-3 md:gap-3 md:px-6">
        <Textarea
          aria-label={l.composerLabel}
          placeholder={l.composerPlaceholder}
          rows={Math.min(5, Math.max(1, body.split('\n').length))}
          error={errors.body?.message}
          wrapperClassName="min-w-0 flex-1"
          className="min-h-12 resize-none py-3 focus:py-[11px]"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void submit();
            }
          }}
          {...register('body')}
        />
        <Button type="submit" size="md" disabled={send.isPending} aria-label={l.send} className="shrink-0 px-4 md:px-6">
          <SendIcon />
          <span className="hidden md:inline">{send.isPending ? l.sending : l.send}</span>
        </Button>
      </form>
      <p className="bg-bg-surface px-4 pb-3 text-caption text-text-muted md:px-6">
        {l.hint}
        {body.length > MESSAGE_BODY_MAX - 200 && ` · ${body.length}/${MESSAGE_BODY_MAX}`}
      </p>
    </section>
  );
}

function MessageBubble({ message, own, showSender, labels, roleLabel }: { message: MessageItem; own: boolean; showSender: boolean; labels: ChatLabels; roleLabel: (role: string) => string }) {
  const { sender } = message;
  const name = shortName(sender.firstName, sender.lastName);
  return (
    <div className={cn('flex items-end gap-2.5', own && 'flex-row-reverse')}>
      {!own && (showSender ? <Avatar size="sm" initials={initials(sender.firstName, sender.lastName)} src={sender.avatarUrl} /> : <span aria-hidden className="w-8 shrink-0" />)}
      <div className={cn('flex max-w-[85%] flex-col gap-1 md:max-w-[70%]', own ? 'items-end' : 'items-start')}>
        {showSender && <p className="text-caption text-text-muted">{name} · {roleLabel(sender.role)}</p>}
        <p
          className={cn(
            'whitespace-pre-wrap break-words rounded-lg px-4 py-2.5 text-body-sm md:text-body',
            own ? 'rounded-br-sm bg-brand-primary text-text-on-inverse' : 'rounded-bl-sm border border-border-default bg-bg-surface text-text-primary',
          )}
        >
          <span className="sr-only">{own ? labels.you : name}: </span>
          {message.body}
        </p>
        <p className="text-caption text-text-muted">
          <time dateTime={message.createdAt}>{timeOf(message.createdAt)}</time>
          {own && message.readAt ? ` · ${labels.read}` : ''}
        </p>
      </div>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (value: string | Date) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};
const timeOf = (iso: string) => {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
function dayLabel(iso: string, labels: ChatLabels, locale: Locale): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today)) return labels.today;
  if (dayKey(iso) === dayKey(yesterday)) return labels.yesterday;
  return formatDate(iso, locale);
}
