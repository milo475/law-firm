// Figma: 02 Client Portal / Portal / 05 Case Detail / Desktop (31:361) + Mobile (36:1065)
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DownloadIcon } from '@/components/icons';
import { ChatThread } from '@/components/messages/chat-thread';
import { DocumentRequestsPanel } from '@/components/portal/document-requests-panel';
import { TestimonialPanel } from '@/components/portal/testimonial-panel';
import { useUser } from '@/components/portal/user-context';
import { Avatar } from '@/components/ui/avatar';
import { CASE_STATUS_BADGE, INVOICE_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileChip } from '@/components/ui/file-chip';
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type CaseDetail, type CaseEvent, type DocumentItem, type DocumentRequestItem, type InvoiceItem, type Paginated, type PublicUser } from '@/lib/api';
import { isRequestOverdue, needsClientAction } from '@/lib/document-requests';
import { useCaseUnreadCount } from '@/lib/messages';
import { formatBytes, formatDate, formatMoney } from '@/lib/format';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { cn, initials, shortName } from '@/lib/utils';

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt';

/** GET /cases/:id returns contact fields on the lawyer that `PublicUser` doesn't declare. */
type Contact = PublicUser & { email?: string | null; phone?: string | null };

/** Timeline "Rail" dot colour per event type (Figma dots use the status fg colours). */
const EVENT_DOT: Record<string, string> = {
  HEARING: 'bg-status-progress-fg',
  MEETING: 'bg-status-progress-fg',
  STATUS_CHANGE: 'bg-status-progress-fg',
  DEADLINE: 'bg-status-pending-fg',
  DOCUMENT: 'bg-status-new-fg',
  NOTE: 'bg-status-closed-fg',
};

/** Card titles: Mobile/H3 (20/28) → Heading/H4 (22/30) on desktop. */
const CARD_TITLE = 'font-serif text-[20px] font-semibold leading-7 md:text-h4';

/** Mobile tab (36:1086): 52px, 12px padding, 14/22 medium → desktop Tab item (10:63). */
const TAB_TRIGGER = 'h-[52px] px-3 text-body-sm-medium data-[state=active]:text-body-sm-medium md:h-12 md:px-5 md:text-body md:data-[state=active]:text-body-medium';

const TABS = [
  { value: 'overview' },
  { value: 'timeline', mobile: true },
  { value: 'documents' },
  { value: 'requests', mobile: true },
  { value: 'invoices' },
  { value: 'messages' },
];

/** "2026.09.24 10:00" → "10:00" */
const timeOf = (iso: string, locale: Locale) => formatDate(iso, locale, true).split(' ')[1] ?? '';

export default function CaseDetailPage() {
  const t = useTranslations('portal.caseDetail');
  const tCaseStatus = useTranslations('enums.caseStatus');
  const tCommon = useTranslations('common');
  const tCaseType = useTranslations('enums.caseType');
  const tInvoiceStatus = useTranslations('portal.invoices.status');
  const tChat = useTranslations('portal.chat');
  const tRole = useTranslations('enums.role');
  const locale = useLocale() as Locale;
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  // Notification links open a tab directly, e.g. ?tab=requests
  const tabParam = useSearchParams().get('tab');
  const validTab = tabParam && TABS.some((item) => item.value === tabParam) ? tabParam : null;
  const [tab, setTab] = useState(validTab ?? 'overview');
  useEffect(() => {
    if (validTab) setTab(validTab);
  }, [validTab]);

  const detail = useQuery({ queryKey: ['case', id], queryFn: () => api.get<CaseDetail>(`/cases/${id}`), retry: false });
  const events = useQuery({ queryKey: ['case-events', id], queryFn: () => api.get<CaseEvent[]>(`/cases/${id}/events`), enabled: detail.isSuccess });
  const documents = useQuery({ queryKey: ['case-documents', id], queryFn: () => api.get<DocumentItem[]>(`/cases/${id}/documents`), enabled: detail.isSuccess });
  const invoices = useQuery({ queryKey: ['invoices', 'case', id], queryFn: () => api.get<Paginated<InvoiceItem>>(`/invoices?caseId=${id}&limit=50`), enabled: detail.isSuccess });
  const unreadMessagesQuery = useCaseUnreadCount(id, detail.isSuccess);
  const requests = useQuery({ queryKey: ['case-document-requests', id], queryFn: () => api.get<DocumentRequestItem[]>(`/cases/${id}/document-requests`), enabled: detail.isSuccess });

  // Keep the active tab visible in the horizontally scrolling mobile tab strip.
  useEffect(() => {
    document.querySelector<HTMLElement>('[role="tab"][data-state="active"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [tab, detail.isSuccess]);

  const upload = useMutation({
    mutationFn: (file: File) => { const form = new FormData(); form.append('file', file); return api.post<DocumentItem>(`/cases/${id}/documents`, form); },
    onSuccess: (doc) => { toast.success(t('uploadedTitle'), t('uploadedBody', { name: doc.name })); void queryClient.invalidateQueries({ queryKey: ['case-documents', id] }); },
    onError: (error) => toast.danger(t('uploadFailed'), error instanceof ApiError ? error.message : t('tryAgain')),
  });

  async function download(doc: DocumentItem) {
    try {
      const { url } = await api.get<{ url: string }>(`/documents/${doc.id}/download`);
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      toast.danger(t('downloadFailed'), error instanceof ApiError ? error.message : t('tryAgain'));
    }
  }

  if (detail.isError) {
    const err = detail.error;
    const forbidden = err instanceof ApiError && err.status === 403;
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb label={tCommon('breadcrumb')} items={[{ label: t('cases'), href: '/portal/cases' }, { label: forbidden ? t('forbiddenCrumb') : t('notFoundCrumb') }]} />
        <ErrorState title={forbidden ? t('forbiddenTitle') : t('notFoundTitle')} message={err instanceof ApiError ? err.message : t('loadError')} />
        <div><Button asChild variant="secondary" size="sm"><Link href="/portal/cases">{t('backToCases')}</Link></Button></div>
      </div>
    );
  }
  if (!detail.data) {
    return <div className="flex flex-col gap-6"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-2/3" /><CardSkeleton /></div>;
  }
  const c = detail.data;
  const lawyer = c.lawyer as Contact;
  const pickFile = () => fileInput.current?.click();

  // Newest first for the timeline; the next event is the earliest one from now on.
  const timeline = [...(events.data ?? [])].sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  const now = new Date();
  const nextEvent = [...timeline].reverse().find((e) => new Date(e.eventDate) >= now);
  const docs = documents.data ?? [];
  const invoiceItems = invoices.data?.items ?? [];
  const openRequests = (requests.data ?? []).filter(needsClientAction);
  const unreadMessages = unreadMessagesQuery.data?.count ?? 0;

  const overview = <OverviewCard c={c} />;
  const timelineCard = <TimelineCard events={timeline.slice(0, 5)} loading={events.isLoading} />;
  const nextEventCard = <NextEventCard event={nextEvent} loading={events.isLoading} />;
  const lawyerCard = <LawyerCard lawyer={lawyer} onMessage={() => setTab('messages')} />;
  const recentDocs = <RecentDocumentsCard documents={docs} loading={documents.isLoading} onShowAll={() => setTab('documents')} onDownload={(d) => void download(d)} />;
  const finance = <FinanceCard invoices={invoiceItems} loading={invoices.isLoading} />;
  // A testimonial is only asked for once the work is done.
  const testimonial = c.status === 'CLOSED' ? <TestimonialPanel caseId={id} /> : null;

  return (
    <div className="flex flex-col">
      <input ref={fileInput} type="file" accept={ACCEPT} className="sr-only" aria-label={t('pickFile')} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />

      {/* Case header — full-bleed white strip on mobile (36:1077), plain on desktop (31:376) */}
      <div className="-mx-5 -mt-6 flex flex-col gap-3 bg-bg-surface p-5 md:mx-0 md:mt-0 md:gap-4 md:bg-transparent md:p-0">
        <nav aria-label={t('breadcrumbLabel')} className="hidden md:block">
          <ol className="flex items-center gap-2 text-caption text-text-muted">
            <li><Link href="/portal/cases" className="focus-ring rounded-sm hover:text-text-brand">{t('cases')}</Link></li>
            <li aria-hidden>›</li>
            <li aria-current="page">{c.caseNumber}</li>
          </ol>
        </nav>
        <div className="flex items-center justify-between gap-3 md:hidden">
          <span className="text-caption text-text-muted">{c.caseNumber}</span>
          <StatusBadge map={CASE_STATUS_BADGE} status={c.status} label={tCaseStatus(c.status)} />
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 flex-col gap-3 md:max-w-[640px] md:gap-2.5">
            <div className="flex items-center gap-3.5">
              <h2 className="min-w-0 font-serif text-[26px] font-semibold leading-[34px] tracking-[-0.2px] md:text-h2">{c.title}</h2>
              <StatusBadge map={CASE_STATUS_BADGE} status={c.status} label={tCaseStatus(c.status)} className="hidden md:inline-flex" />
            </div>
            <p className="text-caption text-text-secondary md:text-body-sm">
              <span className="hidden md:inline">{c.caseNumber} · </span>
              {tCaseType(c.type)}
              <span className="md:hidden"> · {t('metaMobile', { opened: formatDate(c.openedAt, locale), updated: formatDate(c.updatedAt, locale) })}</span>
              <span className="hidden md:inline"> · {t('metaDesktop', { opened: formatDate(c.openedAt, locale), updated: formatDate(c.updatedAt, locale) })}</span>
              {c.closedAt && ` · ${t('metaClosed', { date: formatDate(c.closedAt, locale) })}`}
            </p>
          </div>
          <div className="hidden shrink-0 gap-3 md:flex">
            <Button variant="secondary" size="md" onClick={pickFile} disabled={upload.isPending}>{upload.isPending ? t('uploading') : t('addDocument')}</Button>
            <Button size="md" onClick={() => setTab('messages')}>{t('contactLawyer')}</Button>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        {/* Mobile: white 52px strip (36:1085); desktop: Tabs (10:64) under the header */}
        <TabsList className="-mx-5 w-auto bg-bg-surface px-5 md:mx-0 md:mt-4 md:w-fit md:bg-transparent md:px-0">
          {TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value} className={TAB_TRIGGER}>
              {item.mobile ? (
                <>
                  <span className="md:hidden">{t(`tabs.${item.value}Short`)}</span>
                  <span className="hidden md:inline">{t(`tabs.${item.value}`)}</span>
                </>
              ) : (
                t(`tabs.${item.value}`)
              )}
              {item.value === 'messages' && unreadMessages > 0 && (
                <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent-default px-1.5 text-caption text-text-on-accent" aria-label={t('unreadBadge', { count: unreadMessages })}>
                  {unreadMessages}
                </span>
              )}
              {item.value === 'requests' && openRequests.length > 0 && (
                <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-status-danger-bg px-1.5 text-caption text-status-danger-fg" aria-label={t('pendingBadge', { count: openRequests.length })}>
                  {openRequests.length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="pt-5 md:pt-6">
          {openRequests.length > 0 && (
            <RequestsAlert count={openRequests.length} overdue={openRequests.some((r) => isRequestOverdue(r))} onOpen={() => setTab('requests')} />
          )}
          {/* Mobile + tablet: single column in the mobile frame's order (36:1096) */}
          <div className="flex flex-col gap-4 xl:hidden">
            {overview}
            {testimonial}
            {nextEventCard}
            {timelineCard}
            {lawyerCard}
            <div className="hidden flex-col gap-4 md:flex">{recentDocs}{finance}</div>
          </div>
          {/* Desktop: fluid left column + 344px right column (31:403) */}
          <div className="hidden items-start gap-6 xl:flex">
            <div className="flex min-w-0 flex-1 flex-col gap-6">{overview}{testimonial}{timelineCard}{recentDocs}</div>
            <div className="flex w-[344px] shrink-0 flex-col gap-5">{lawyerCard}{nextEventCard}{finance}</div>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="pt-5 md:pt-6">
          <TimelineCard events={timeline} loading={events.isLoading} showDescriptionOnMobile />
        </TabsContent>

        <TabsContent value="documents" className="pt-5 md:pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-body-sm text-text-secondary">{t('documentsHint')}</p>
              <Button size="sm" onClick={pickFile} disabled={upload.isPending}>{upload.isPending ? t('uploading') : t('addDocument')}</Button>
            </div>
            {documents.isLoading ? <Skeleton className="h-32" /> : docs.length === 0 ? (
              <EmptyState title={t('noDocumentsTitle')} action={<Button size="sm" variant="secondary" onClick={pickFile}>{t('firstDocument')}</Button>} />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {docs.map((d) => (
                  <FileChip key={d.id} name={d.name} mimeType={d.mimeType} meta={`${formatBytes(d.size)} · ${formatDate(d.createdAt, locale)}`} action={<DownloadAction doc={d} onDownload={(doc) => void download(doc)} />} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="pt-5 md:pt-6">
          {requests.isError ? (
            <ErrorState message={requests.error instanceof ApiError ? requests.error.message : t('loadError')} onRetry={() => void requests.refetch()} />
          ) : requests.isLoading ? (
            <Skeleton className="h-40" />
          ) : (requests.data?.length ?? 0) === 0 ? (
            <EmptyState title={t('noRequestsTitle')} description={t('noRequestsDescription')} />
          ) : (
            <DocumentRequestsPanel caseId={id} requests={requests.data!} onDownload={(doc) => void download(doc)} />
          )}
        </TabsContent>

        <TabsContent value="invoices" className="pt-5 md:pt-6">
          {invoices.isLoading ? <Skeleton className="h-32" /> : invoiceItems.length === 0 ? (
            <EmptyState title={t('noInvoices')} />
          ) : (
            <Table>
              <TableHead><TableRow><TableHeaderCell>{t('invoiceColumns.number')}</TableHeaderCell><TableHeaderCell>{t('invoiceColumns.description')}</TableHeaderCell><TableHeaderCell className="text-right">{t('invoiceColumns.amount')}</TableHeaderCell><TableHeaderCell>{t('invoiceColumns.due')}</TableHeaderCell><TableHeaderCell>{t('invoiceColumns.status')}</TableHeaderCell></TableRow></TableHead>
              <TableBody>
                {invoiceItems.map((inv) => (
                  <TableRow key={inv.id} interactive>
                    <TableCell className="text-body-sm-medium text-text-primary"><Link href={`/portal/invoices/${inv.id}`} className="focus-ring rounded-sm">{inv.invoiceNumber}</Link></TableCell>
                    <TableCell>{inv.description}</TableCell>
                    <TableCell className="text-right text-body-sm-medium text-text-primary">{formatMoney(inv.amount, locale)}</TableCell>
                    <TableCell>{formatDate(inv.dueDate, locale)}</TableCell>
                    <TableCell><StatusBadge map={INVOICE_STATUS_BADGE} status={inv.status} label={tInvoiceStatus(inv.status)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="messages" className="pt-5 md:pt-6">
          <ChatThread
            caseId={id}
            viewer={user}
            active={tab === 'messages'}
            counterpart={{
              name: shortName(lawyer.firstName, lawyer.lastName),
              roleLabel: t('assignedLawyer'),
              initials: initials(lawyer.firstName, lawyer.lastName),
              avatarUrl: lawyer.avatarUrl,
            }}
            emptyDescription={t('chatEmpty')}
            locale={locale}
            roleLabel={(role) => tRole(role)}
            labels={{
              section: tChat('section'),
              loadError: tChat('loadError'),
              loading: tChat('loading'),
              loadingMore: tChat('loadingMore'),
              emptyTitle: tChat('emptyTitle'),
              olderMessages: tChat('olderMessages'),
              messages: tChat('messages'),
              composerLabel: tChat('composerLabel'),
              composerPlaceholder: tChat('composerPlaceholder'),
              send: tChat('send'),
              sending: tChat('sending'),
              hint: tChat('hint'),
              sendFailed: tChat('sendFailed'),
              tryAgain: tChat('tryAgain'),
              you: tChat('you'),
              read: tChat('read'),
              today: tChat('today'),
              yesterday: tChat('yesterday'),
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Open document requests on the case — pending tone, danger once a due date has passed. */
function RequestsAlert({ count, overdue, onOpen }: { count: number; overdue: boolean; onOpen: () => void }) {
  const t = useTranslations('portal.caseDetail.requestsAlert');
  return (
    <div
      role="status"
      className={cn(
        'mb-4 flex flex-col gap-3 rounded-lg border-l-[3px] p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6 md:px-7 xl:mb-6',
        overdue ? 'border-status-danger-fg bg-status-danger-bg' : 'border-status-pending-fg bg-status-pending-bg',
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className={cn('text-h4', overdue ? 'text-status-danger-fg' : 'text-status-pending-fg')}>{t('title', { count })}</p>
        <p className="text-body-sm text-text-secondary">{overdue ? `${t('overdue')} ` : ''}{t('body')}</p>
      </div>
      <Button size="md" className="w-full shrink-0 md:w-auto" onClick={onOpen}>{t('cta')}</Button>
    </div>
  );
}

/** Figma "Overview" (31:405 / 36:1097): title, description, facts (2-col grid desktop, label/value rows mobile). */
function OverviewCard({ c }: { c: CaseDetail }) {
  const t = useTranslations('portal.caseDetail.overview');
  const tCaseType = useTranslations('enums.caseType');
  const locale = useLocale() as Locale;
  // The design's court / claim / opposing party / judge fields don't exist in the API — show real case facts instead.
  const facts = [
    { label: t('caseType'), value: tCaseType(c.type) },
    { label: t('opened'), value: formatDate(c.openedAt, locale) },
    { label: t('documents'), value: t('documentsCount', { count: c._count.documents }) },
    c.closedAt ? { label: t('closed'), value: formatDate(c.closedAt, locale) } : { label: t('invoices'), value: `${c._count.invoices}` },
  ];
  return (
    <Card className="flex flex-col gap-3 p-[18px] md:gap-3.5 md:p-6">
      <h3 className={CARD_TITLE}>{t('title')}</h3>
      <p className="text-body-sm text-text-secondary md:text-body">{c.description ?? t('noDescription')}</p>
      <dl className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-4">
        {facts.map((f) => (
          <div key={f.label} className="flex items-start justify-between gap-4 md:flex-col md:justify-start md:gap-1">
            <dt className="text-caption text-text-muted">{f.label}</dt>
            <dd className="text-right text-body-sm-medium text-text-primary md:text-left">{f.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** Figma "Timeline" (31:421 / 36:1118): 14px (12px mobile) status dot + 2px rail, date / title / description. */
function TimelineCard({ events, loading, showDescriptionOnMobile }: { events: CaseEvent[]; loading: boolean; showDescriptionOnMobile?: boolean }) {
  const t = useTranslations('portal.caseDetail.timeline');
  const tEvent = useTranslations('enums.caseEvent');
  const locale = useLocale() as Locale;
  return (
    <Card className="flex flex-col gap-4 p-[18px] md:gap-[18px] md:p-6">
      <h3 className={CARD_TITLE}>{t('title')}</h3>
      {loading ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
      ) : events.length === 0 ? (
        <p className="text-body-sm text-text-secondary">{t('empty')}</p>
      ) : (
        <ol className="flex flex-col gap-4 md:gap-[18px]">
          {events.map((e, i) => {
            const last = i === events.length - 1;
            return (
              <li key={e.id} className="flex gap-3.5 md:gap-4">
                <span aria-hidden className="flex w-3.5 shrink-0 flex-col items-center md:w-5">
                  <span className={cn('size-3 shrink-0 rounded-full md:size-3.5', EVENT_DOT[e.type] ?? 'bg-status-closed-fg')} />
                  {!last && <span className="w-0.5 flex-1 bg-border-default" />}
                </span>
                <div className={cn('flex min-w-0 flex-1 flex-col gap-[3px] md:gap-1', !last && 'pb-2.5 md:pb-3')}>
                  <p className="text-caption text-text-muted"><span className="sr-only">{tEvent(e.type)} · </span>{formatDate(e.eventDate, locale)}</p>
                  <p className="text-body-sm-medium text-text-primary md:text-body-medium">{e.title}</p>
                  {e.description && <p className={cn('text-body-sm text-text-secondary', !showDescriptionOnMobile && 'hidden md:block')}>{e.description}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

/** Figma "Next event" (31:501 / 36:1109): navy date tile + title + time · details; hearing reminder on desktop. */
function NextEventCard({ event, loading }: { event?: CaseEvent; loading: boolean }) {
  const t = useTranslations('portal.caseDetail.nextEvent');
  const tEvent = useTranslations('enums.caseEvent');
  const locale = useLocale() as Locale;
  const d = event ? new Date(event.eventDate) : null;
  return (
    <Card className="flex flex-col gap-3 p-[18px] md:p-6">
      <h3 className="text-body-medium text-text-primary">{t('title')}</h3>
      {loading ? (
        <Skeleton className="h-14" />
      ) : !event || !d ? (
        <p className="text-body-sm text-text-secondary">{t('empty')}</p>
      ) : (
        <>
          <div className="flex items-center gap-3.5">
            <div aria-hidden className="flex size-14 shrink-0 flex-col items-center justify-center rounded-md bg-bg-inverse md:size-[60px]">
              <span className="font-serif text-[20px] font-semibold leading-7 text-accent-default md:text-h4">{String(d.getDate()).padStart(2, '0')}</span>
              <span className="text-caption text-text-on-inverse-muted">{t('month', { month: d.getMonth() + 1 })}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <p className="text-body-sm-medium text-text-primary"><span className="sr-only">{formatDate(event.eventDate, locale)}, </span>{event.title}</p>
              <p className="text-caption text-text-secondary md:text-body-sm">{timeOf(event.eventDate, locale)} · {event.description ?? tEvent(event.type)}</p>
            </div>
          </div>
          {event.type === 'HEARING' && (
            <p className="hidden rounded-md bg-status-pending-bg px-3.5 py-3 text-body-sm text-status-pending-fg md:block">
              {t('hearingNote')}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

/** Figma "Lawyer" (31:485 / 36:1147): avatar + name, phone / email rows (desktop), message + call buttons (mobile). */
function LawyerCard({ lawyer, onMessage }: { lawyer: Contact; onMessage: () => void }) {
  const t = useTranslations('portal.caseDetail.lawyer');
  const tRole = useTranslations('enums.role');
  return (
    <Card className="flex flex-col gap-3.5 p-[18px] md:gap-4 md:p-6">
      <h3 className="text-body-medium text-text-primary">{t('title')}</h3>
      <div className="flex items-center gap-3 md:gap-3.5">
        <Avatar initials={initials(lawyer.firstName, lawyer.lastName)} src={lawyer.avatarUrl} className="text-body-sm-medium md:size-14 md:text-body-medium" />
        <div className="flex min-w-0 flex-col gap-[3px]">
          <p className="text-body-sm-medium text-text-primary md:text-body-medium">{shortName(lawyer.firstName, lawyer.lastName)}</p>
          <p className="text-caption text-text-secondary md:text-body-sm">{tRole(lawyer.role)}</p>
        </div>
      </div>
      {(lawyer.phone || lawyer.email) && (
        <dl className="hidden flex-col gap-4 md:flex">
          {lawyer.phone && <ContactRow label={t('phone')} value={lawyer.phone} href={`tel:${lawyer.phone}`} />}
          {lawyer.email && <ContactRow label={t('email')} value={lawyer.email} href={`mailto:${lawyer.email}`} />}
        </dl>
      )}
      <Button variant="secondary" size="md" className="hidden w-full md:inline-flex" onClick={onMessage}>{t('message')}</Button>
      <div className="flex gap-2.5 md:hidden">
        <Button variant="secondary" size="md" className="flex-1" onClick={onMessage}>{t('messageShort')}</Button>
        {lawyer.phone && <Button asChild size="md" className="flex-1"><a href={`tel:${lawyer.phone}`}>{t('call')}</a></Button>}
      </div>
    </Card>
  );
}

function ContactRow({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-body-sm">
      <dt className="shrink-0 text-text-muted">{label}</dt>
      <dd className="min-w-0">
        {/* 44px hit area without changing the 22px row rhythm */}
        <a href={href} className="focus-ring -my-[11px] inline-flex min-h-11 max-w-full items-center truncate rounded-sm text-body-sm-medium text-text-primary hover:text-text-brand">{value}</a>
      </dd>
    </div>
  );
}

/** Figma "Documents" (31:462): latest 3 file chips + an "all documents" link (switches to the documents tab). */
function RecentDocumentsCard({ documents, loading, onShowAll, onDownload }: { documents: DocumentItem[]; loading: boolean; onShowAll: () => void; onDownload: (doc: DocumentItem) => void }) {
  const t = useTranslations('portal.caseDetail.documentsCard');
  const locale = useLocale() as Locale;
  return (
    <Card className="flex flex-col gap-3.5 p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-h4">{t('title')}</h3>
        <button type="button" onClick={onShowAll} className="focus-ring -my-[7px] inline-flex min-h-11 items-center rounded-sm text-body-sm-medium text-text-accent hover:underline">{t('all')}</button>
      </div>
      {loading ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-[62px]" /><Skeleton className="h-[62px]" /></div>
      ) : documents.length === 0 ? (
        <p className="text-body-sm text-text-secondary">{t('empty')}</p>
      ) : (
        documents.slice(0, 3).map((d) => (
          <FileChip key={d.id} name={d.name} mimeType={d.mimeType} meta={`${formatBytes(d.size)} · ${formatDate(d.createdAt, locale)}`} action={<DownloadAction doc={d} onDownload={onDownload} />} />
        ))
      )}
    </Card>
  );
}

function DownloadAction({ doc, onDownload }: { doc: DocumentItem; onDownload: (doc: DocumentItem) => void }) {
  const t = useTranslations('portal.caseDetail');
  return (
    <Button variant="ghost" size="icon" onClick={() => onDownload(doc)} aria-label={t('downloadNamed', { name: doc.name })} title={t('download')} className="-my-0.5 -mr-2 text-text-secondary hover:text-text-brand">
      <DownloadIcon />
    </Button>
  );
}

/** Figma "Finance" (31:512): billed / paid / unpaid totals from this case's invoices + pay the earliest open one. */
function FinanceCard({ invoices, loading }: { invoices: InvoiceItem[]; loading: boolean }) {
  const t = useTranslations('portal.caseDetail.finance');
  const locale = useLocale() as Locale;
  const billable = invoices.filter((i) => i.status !== 'DRAFT' && i.status !== 'CANCELLED');
  const sum = (list: InvoiceItem[]) => list.reduce((total, i) => total + Number(i.amount), 0);
  const open = billable.filter((i) => i.status === 'SENT' || i.status === 'OVERDUE').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const unpaid = sum(open);
  return (
    <Card className="flex flex-col gap-3 p-6">
      <h3 className="text-body-medium text-text-primary">{t('title')}</h3>
      {loading ? (
        <Skeleton className="h-24" />
      ) : (
        <>
          <dl className="flex flex-col gap-3">
            <MoneyRow label={t('billed')} value={formatMoney(sum(billable), locale)} />
            <MoneyRow label={t('paid')} value={formatMoney(sum(billable.filter((i) => i.status === 'PAID')), locale)} className="text-status-progress-fg" />
            <MoneyRow label={t('unpaid')} value={formatMoney(unpaid, locale)} className={unpaid > 0 ? 'text-status-danger-fg' : undefined} />
          </dl>
          {open[0] && <Button asChild size="md" className="w-full"><Link href={`/portal/invoices/${open[0].id}`}>{t('pay')}</Link></Button>}
        </>
      )}
    </Card>
  );
}

function MoneyRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-body-sm text-text-muted">{label}</dt>
      <dd className={cn('text-body-sm-medium text-text-primary', className)}>{value}</dd>
    </div>
  );
}
