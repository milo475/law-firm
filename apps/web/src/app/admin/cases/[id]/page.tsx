'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCaseSchema } from '@law-firm/shared/schemas';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmModal } from '@/components/admin/confirm-modal';
import { ChatThread } from '@/components/messages/chat-thread';
import { DocumentRequestsTab } from '@/components/admin/document-requests-tab';
import { EventModal } from '@/components/admin/event-modal';
import { InvoiceActions } from '@/components/admin/invoice-actions';
import { InvoiceModal } from '@/components/admin/invoice-modal';
import { useInvalidateCase, useLawyerOptions } from '@/components/admin/queries';
import { PlusIcon } from '@/components/icons';
import { useUser } from '@/components/portal/user-context';
import { Badge, CASE_STATUS_BADGE, INVOICE_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FileChip } from '@/components/ui/file-chip';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type CaseDetail, type CaseEvent, type DocumentItem, type DocumentRequestItem, type InvoiceItem, type Paginated, type PublicUser } from '@/lib/api';
import { CASE_STATUSES, CASE_TYPES, type CaseStatus } from '@/lib/admin';
import { isAwaitingReview } from '@/lib/document-requests';
import { useCaseUnreadCount } from '@/lib/messages';
import { CASE_EVENT_LABELS, CASE_STATUS_LABELS, CASE_TYPE_LABELS, formatBytes, formatDate, formatMoney } from '@/lib/format';
import { initials, shortName } from '@/lib/utils';

type StaffPerson = PublicUser & { email: string; phone: string | null };
type StaffCaseDetail = CaseDetail & { client: StaffPerson; lawyer: StaffPerson };

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt';
const TAB_VALUES = ['overview', 'timeline', 'documents', 'requests', 'messages', 'invoices'];

const OverviewSchema = z.object({
  title: CreateCaseSchema.shape.title,
  type: CreateCaseSchema.shape.type,
  description: z.string().trim().max(5000, 'Тайлбар хэт урт байна'),
  lawyerId: z.string(),
});
type OverviewValues = z.infer<typeof OverviewSchema>;

export default function AdminCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const isAdmin = user.role === 'ADMIN';
  const invalidate = useInvalidateCase(id);

  const detail = useQuery({ queryKey: ['admin', 'case', id], queryFn: () => api.get<StaffCaseDetail>(`/cases/${id}`), retry: false });
  const requests = useQuery({
    queryKey: ['admin', 'case', id, 'document-requests'],
    queryFn: () => api.get<DocumentRequestItem[]>(`/cases/${id}/document-requests`),
    enabled: detail.isSuccess,
  });
  // Notification links open a tab directly, e.g. ?tab=requests
  const tabParam = useSearchParams().get('tab');
  const validTab = tabParam && TAB_VALUES.includes(tabParam) ? tabParam : null;
  const [tab, setTab] = useState(validTab ?? 'overview');
  useEffect(() => {
    if (validTab) setTab(validTab);
  }, [validTab]);
  const unreadMessages = useCaseUnreadCount(id, detail.isSuccess);
  // Keep the active tab visible in the horizontally scrolling tab strip on mobile.
  useEffect(() => {
    document.querySelector<HTMLElement>('[role="tab"][data-state="active"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [tab, detail.isSuccess]);
  const [closeOpen, setCloseOpen] = useState(false);

  const updateStatus = useMutation({
    mutationFn: (status: CaseStatus) => api.patch<StaffCaseDetail>(`/cases/${id}`, { status }),
    onSuccess: async (updated) => {
      toast.success('Төлөв өөрчлөгдлөө', `«${CASE_STATUS_LABELS[updated.status]}» болж, явцын түүхэд бичигдлээ.`);
      await invalidate();
    },
    onError: (error) => toast.danger('Төлөв солиход алдаа гарлаа', error instanceof ApiError ? error.message : undefined),
  });
  const closeCase = useMutation({
    mutationFn: (note: string) => api.patch(`/cases/${id}/close`, note.trim() ? { note: note.trim() } : {}),
    onSuccess: async () => {
      toast.success('Хэрэг хаагдлаа');
      setCloseOpen(false);
      await invalidate();
    },
    onError: (error) => toast.danger('Хэрэг хааж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  if (detail.isError) {
    const err = detail.error;
    const forbidden = err instanceof ApiError && err.status === 403;
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb items={[{ label: 'Хэргүүд', href: '/admin/cases' }, { label: forbidden ? 'Хандах эрхгүй' : 'Олдсонгүй' }]} />
        <ErrorState
          title={forbidden ? '403 — Энэ хэргийг удирдах эрх танд байхгүй' : '404 — Хэрэг олдсонгүй'}
          message={forbidden ? 'Та зөвхөн өөрийн хариуцсан хэргийг нээх боломжтой.' : err instanceof ApiError ? err.message : 'Алдаа гарлаа'}
        />
        <div><Button asChild variant="secondary" size="sm"><Link href="/admin/cases">Хэргүүд рүү буцах</Link></Button></div>
      </div>
    );
  }
  if (!detail.data) {
    return <div className="flex flex-col gap-6"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-2/3" /><CardSkeleton /></div>;
  }

  const c = detail.data;
  const isClosed = c.status === 'CLOSED';
  const awaitingReview = (requests.data ?? []).filter(isAwaitingReview).length;
  const unreadCount = unreadMessages.data?.count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Хэргүүд', href: '/admin/cases' }, { label: c.caseNumber }]} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-caption text-text-muted">{c.caseNumber}</span>
            <StatusBadge map={CASE_STATUS_BADGE} status={c.status} />
          </div>
          <h2 className="text-h3 md:text-h2">{c.title}</h2>
          <p className="text-body-sm text-text-secondary">
            {CASE_TYPE_LABELS[c.type] ?? c.type} · нээгдсэн {formatDate(c.openedAt)}
            {c.closedAt ? ` · хаагдсан ${formatDate(c.closedAt)}` : ''} · харилцагч{' '}
            <Link href={`/admin/clients/${c.client.id}`} className="focus-ring rounded-sm text-text-accent hover:underline">{shortName(c.client.firstName, c.client.lastName)}</Link>
            {' '}· хуульч {shortName(c.lawyer.firstName, c.lawyer.lastName)}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            wrapperClassName="w-[220px]"
            label="Төлөв"
            value={c.status}
            disabled={updateStatus.isPending}
            onValueChange={(value) => {
              if (value === c.status) return;
              if (value === 'CLOSED') setCloseOpen(true);
              else updateStatus.mutate(value as CaseStatus);
            }}
            options={CASE_STATUSES.map((s) => ({ value: s, label: CASE_STATUS_LABELS[s] }))}
          />
          {!isClosed && <Button variant="secondary" size="md" onClick={() => setCloseOpen(true)}>Хэрэг хаах</Button>}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Тойм</TabsTrigger>
          <TabsTrigger value="timeline">Явцын түүх</TabsTrigger>
          <TabsTrigger value="documents">Баримт</TabsTrigger>
          <TabsTrigger value="requests">
            Баримтын хүсэлт
            {awaitingReview > 0 && (
              <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-status-new-bg px-2 py-px text-caption text-status-new-fg" aria-label={`${awaitingReview} хянах`}>
                {awaitingReview}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages">
            Мессеж
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-accent-default px-2 py-px text-caption text-text-on-accent" aria-label={`${unreadCount} уншаагүй`}>
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices">Нэхэмжлэх</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab detail={c} isAdmin={isAdmin} onSaved={invalidate} /></TabsContent>
        <TabsContent value="timeline"><TimelineTab caseId={id} onChanged={invalidate} /></TabsContent>
        <TabsContent value="documents"><DocumentsTab caseId={id} userId={user.id} isAdmin={isAdmin} onChanged={invalidate} /></TabsContent>
        <TabsContent value="requests"><DocumentRequestsTab caseId={id} isClosed={isClosed} requests={requests} onChanged={invalidate} /></TabsContent>
        <TabsContent value="messages">
          <ChatThread
            caseId={id}
            viewer={user}
            active={tab === 'messages'}
            counterpart={{
              name: shortName(c.client.firstName, c.client.lastName),
              roleLabel: 'Харилцагч',
              initials: initials(c.client.firstName, c.client.lastName),
              avatarUrl: c.client.avatarUrl,
            }}
            emptyDescription="Харилцагчид мессеж бичиж харилцаа эхлүүлээрэй. Илгээхэд харилцагчид мэдэгдэл очно."
          />
        </TabsContent>
        <TabsContent value="invoices"><InvoicesTab caseId={id} onChanged={invalidate} /></TabsContent>
      </Tabs>

      <ConfirmModal
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title="Хэрэг хаах"
        description={`${c.caseNumber} хэргийг «Хаагдсан» төлөвт шилжүүлнэ. Өөрчлөлт явцын түүхэд бичигдэж, харилцагчид харагдана.`}
        noteLabel="Хаах тэмдэглэл"
        confirmLabel="Хэрэг хаах"
        pending={closeCase.isPending}
        onConfirm={(note) => closeCase.mutate(note)}
      />
    </div>
  );
}

// ─── Тойм: edit title / type / description / lawyer ─────────────────────────
function OverviewTab({ detail, isAdmin, onSaved }: { detail: StaffCaseDetail; isAdmin: boolean; onSaved: () => Promise<void> }) {
  const lawyers = useLawyerOptions(isAdmin);
  const form = useForm<OverviewValues>({
    resolver: zodResolver(OverviewSchema),
    defaultValues: { title: detail.title, type: detail.type as OverviewValues['type'], description: detail.description ?? '', lawyerId: detail.lawyer.id },
  });
  const { register, control, handleSubmit, reset, formState: { errors, isDirty } } = form;

  useEffect(() => {
    reset({ title: detail.title, type: detail.type as OverviewValues['type'], description: detail.description ?? '', lawyerId: detail.lawyer.id });
  }, [detail, reset]);

  const save = useMutation({
    mutationFn: (values: OverviewValues) =>
      api.patch(`/cases/${detail.id}`, {
        title: values.title,
        type: values.type,
        description: values.description.trim() || null,
        ...(isAdmin && values.lawyerId && values.lawyerId !== detail.lawyer.id ? { lawyerId: values.lawyerId } : {}),
      }),
    onSuccess: async () => {
      toast.success('Хэрэг шинэчлэгдлээ');
      await onSaved();
    },
    onError: (error) => toast.danger('Хадгалж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <Card className="p-6">
        <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-5">
          <h3 className="text-h4">Хэргийн мэдээлэл</h3>
          <Input label="Хэргийн нэр" required error={errors.title?.message} {...register('title')} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller control={control} name="type" render={({ field }) => (
              <Select label="Хэргийн төрөл" required options={CASE_TYPES.map((t) => ({ value: t, label: CASE_TYPE_LABELS[t] }))} value={field.value} onValueChange={field.onChange} error={errors.type?.message} />
            )} />
            {isAdmin ? (
              <Controller control={control} name="lawyerId" render={({ field }) => (
                <Select label="Хариуцах хуульч" options={lawyers.data ?? [{ value: detail.lawyer.id, label: shortName(detail.lawyer.firstName, detail.lawyer.lastName) }]} value={field.value} onValueChange={field.onChange} helper="Хуульч солиход шинэ хуульч л хэргийг удирдана" />
              )} />
            ) : (
              <Input label="Хариуцах хуульч" value={shortName(detail.lawyer.firstName, detail.lawyer.lastName)} disabled helper="Хуульчийг зөвхөн админ солино" readOnly />
            )}
          </div>
          <Textarea label="Тайлбар" rows={6} error={errors.description?.message} {...register('description')} />
          <div className="flex gap-3">
            <Button type="submit" size="md" disabled={save.isPending || !isDirty}>{save.isPending ? 'Хадгалж байна…' : 'Хадгалах'}</Button>
            {isDirty && <Button variant="ghost" size="md" onClick={() => reset()}>Цуцлах</Button>}
          </div>
        </form>
      </Card>
      <div className="flex flex-col gap-4">
        <PersonCard label="Харилцагч" person={detail.client} href={`/admin/clients/${detail.client.id}`} />
        <PersonCard label="Хариуцсан хуульч" person={detail.lawyer} />
        <Card className="grid grid-cols-3 gap-3 p-5 text-center">
          {[['Үйл явдал', detail._count.events], ['Баримт', detail._count.documents], ['Нэхэмжлэх', detail._count.invoices]].map(([label, count]) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="font-serif text-h4 text-text-brand">{count}</span>
              <span className="text-caption text-text-muted">{label}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function PersonCard({ label, person, href }: { label: string; person: StaffPerson; href?: string }) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <p className="text-caption text-text-muted">{label}</p>
      {href ? (
        <Link href={href} className="focus-ring rounded-sm text-body-medium text-text-primary hover:text-text-brand">{shortName(person.firstName, person.lastName)}</Link>
      ) : (
        <p className="text-body-medium text-text-primary">{shortName(person.firstName, person.lastName)}</p>
      )}
      <a href={`mailto:${person.email}`} className="focus-ring rounded-sm text-body-sm text-text-accent hover:underline">{person.email}</a>
      {person.phone && <a href={`tel:${person.phone}`} className="focus-ring rounded-sm text-body-sm text-text-secondary">{person.phone}</a>}
    </Card>
  );
}

// ─── Явцын түүх: timeline incl. STATUS_CHANGE, add / edit / delete events ─────
function TimelineTab({ caseId, onChanged }: { caseId: string; onChanged: () => Promise<void> }) {
  const events = useQuery({ queryKey: ['admin', 'case', caseId, 'events'], queryFn: () => api.get<CaseEvent[]>(`/cases/${caseId}/events`) });
  const [modal, setModal] = useState<{ open: boolean; event: CaseEvent | null }>({ open: false, event: null });
  const [toDelete, setToDelete] = useState<CaseEvent | null>(null);

  const remove = useMutation({
    mutationFn: (eventId: string) => api.delete(`/events/${eventId}`),
    onSuccess: async () => {
      toast.success('Үйл явдал устгагдлаа');
      setToDelete(null);
      await onChanged();
    },
    onError: (error) => toast.danger('Устгаж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-text-secondary">Төлөв өөрчлөгдөх бүрт автоматаар бичигдэнэ. Нуусан бичлэг харилцагчид харагдахгүй.</p>
        <Button size="sm" onClick={() => setModal({ open: true, event: null })}><PlusIcon size={16} />Үйл явдал нэмэх</Button>
      </div>
      {events.isError ? (
        <ErrorState message={events.error instanceof ApiError ? events.error.message : 'Алдаа гарлаа'} onRetry={() => void events.refetch()} />
      ) : events.isLoading ? (
        <Skeleton className="h-40" />
      ) : (events.data?.length ?? 0) === 0 ? (
        <EmptyState title="Бүртгэгдсэн үйл явдал алга" description="Шүүх хурал, уулзалт, эцсийн хугацаа, тэмдэглэлээ нэмнэ үү." />
      ) : (
        <ol className="flex flex-col gap-3 border-l-2 border-border-default pl-6">
          {events.data!.map((event) => {
            const isStatus = event.type === 'STATUS_CHANGE';
            return (
              <li key={event.id} className="relative rounded-lg border border-border-default bg-bg-surface p-5">
                <span aria-hidden className={`absolute -left-[31px] top-6 size-3 rounded-full border-2 border-bg-page ${isStatus ? 'bg-navy-500' : 'bg-accent-default'}`} />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-overline text-text-accent">{CASE_EVENT_LABELS[event.type] ?? event.type}</span>
                      {event.isVisibleToClient === false && <Badge tone="closed" dot={false}>Харилцагчид нуусан</Badge>}
                    </div>
                    <p className="text-body-medium text-text-primary">{event.title}</p>
                    {event.description && <p className="text-body-sm text-text-secondary">{event.description}</p>}
                    <p className="text-caption text-text-muted">{formatDate(event.eventDate, true)} · {shortName(event.createdBy.firstName, event.createdBy.lastName)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!isStatus && <Button variant="ghost" size="sm" onClick={() => setModal({ open: true, event })}>Засах</Button>}
                    <Button variant="ghost" size="sm" onClick={() => setToDelete(event)}>Устгах</Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <EventModal open={modal.open} event={modal.event} caseId={caseId} onOpenChange={(open) => setModal((m) => ({ ...m, open }))} onSaved={() => void onChanged()} />
      <ConfirmModal
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Үйл явдал устгах"
        description={toDelete ? `«${toDelete.title}» бичлэгийг бүр мөсөн устгах уу?` : ''}
        confirmLabel="Устгах"
        variant="danger"
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}

// ─── Баримт: upload with visibility toggle, download, delete ─────────────────
function DocumentsTab({ caseId, userId, isAdmin, onChanged }: { caseId: string; userId: string; isAdmin: boolean; onChanged: () => Promise<void> }) {
  const documents = useQuery({ queryKey: ['admin', 'case', caseId, 'documents'], queryFn: () => api.get<DocumentItem[]>(`/cases/${caseId}/documents`) });
  const fileInput = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(true);
  const [toDelete, setToDelete] = useState<DocumentItem | null>(null);

  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      form.append('isVisibleToClient', String(visible));
      return api.post<DocumentItem>(`/cases/${caseId}/documents`, form);
    },
    onSuccess: async (doc) => {
      toast.success('Баримт хавсаргагдлаа', doc.isVisibleToClient ? 'Харилцагчид харагдана.' : 'Зөвхөн ажилтнуудад харагдана.');
      await onChanged();
    },
    onError: (error) => toast.danger('Файл хуулж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });
  const remove = useMutation({
    mutationFn: (docId: string) => api.delete(`/documents/${docId}`),
    onSuccess: async () => {
      toast.success('Баримт устгагдлаа');
      setToDelete(null);
      await onChanged();
    },
    onError: (error) => toast.danger('Устгаж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  async function download(doc: DocumentItem) {
    try {
      const { url } = await api.get<{ url: string }>(`/documents/${doc.id}/download`);
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      toast.danger('Татаж чадсангүй', error instanceof ApiError ? error.message : undefined);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-body-medium text-text-primary">Баримт хавсаргах</p>
          <p className="text-body-sm text-text-secondary">PDF, Word, Excel, JPG, PNG, TXT · 20MB хүртэл</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Checkbox label="Харилцагчид харагдана" checked={visible} onCheckedChange={(v) => setVisible(v === true)} />
          <input ref={fileInput} type="file" accept={ACCEPT} className="sr-only" aria-label="Файл сонгох" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />
          <Button size="sm" onClick={() => fileInput.current?.click()} disabled={upload.isPending}>{upload.isPending ? 'Хуулж байна…' : 'Файл сонгох'}</Button>
        </div>
      </Card>
      {documents.isError ? (
        <ErrorState message={documents.error instanceof ApiError ? documents.error.message : 'Алдаа гарлаа'} onRetry={() => void documents.refetch()} />
      ) : documents.isLoading ? (
        <Skeleton className="h-32" />
      ) : (documents.data?.length ?? 0) === 0 ? (
        <EmptyState title="Баримт хавсаргаагүй байна" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {documents.data!.map((doc) => {
            const canDelete = isAdmin || doc.uploadedBy.id === userId;
            return (
              <FileChip
                key={doc.id}
                name={doc.name}
                mimeType={doc.mimeType}
                meta={`${formatBytes(doc.size)} · ${formatDate(doc.createdAt)} · ${shortName(doc.uploadedBy.firstName, doc.uploadedBy.lastName)}${doc.isVisibleToClient ? '' : ' · нуусан'}`}
                action={
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => void download(doc)}>Татах</Button>
                    {canDelete && <Button variant="ghost" size="sm" onClick={() => setToDelete(doc)}>Устгах</Button>}
                  </div>
                }
              />
            );
          })}
        </div>
      )}
      <ConfirmModal
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Баримт устгах"
        description={toDelete ? `«${toDelete.name}» файлыг хадгалалтаас бүр мөсөн устгах уу?` : ''}
        confirmLabel="Устгах"
        variant="danger"
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}

// ─── Нэхэмжлэх: create + status transitions ──────────────────────────────────
function InvoicesTab({ caseId, onChanged }: { caseId: string; onChanged: () => Promise<void> }) {
  const invoices = useQuery({
    queryKey: ['admin', 'invoices', { caseId }],
    queryFn: () => api.get<Paginated<InvoiceItem>>(`/invoices?caseId=${caseId}&limit=100`),
  });
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-text-secondary">Ноорог → Илгээсэн → Төлөгдсөн. Төлөгдсөн болон цуцалсан нэхэмжлэхийг өөрчлөх боломжгүй.</p>
        <Button size="sm" onClick={() => setCreateOpen(true)}><PlusIcon size={16} />Нэхэмжлэх үүсгэх</Button>
      </div>
      {invoices.isError ? (
        <ErrorState message={invoices.error instanceof ApiError ? invoices.error.message : 'Алдаа гарлаа'} onRetry={() => void invoices.refetch()} />
      ) : invoices.isLoading ? (
        <Skeleton className="h-32" />
      ) : (invoices.data?.items.length ?? 0) === 0 ? (
        <EmptyState title="Нэхэмжлэх алга" />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Дугаар</TableHeaderCell>
              <TableHeaderCell>Тайлбар</TableHeaderCell>
              <TableHeaderCell className="text-right">Дүн</TableHeaderCell>
              <TableHeaderCell>Төлөх хугацаа</TableHeaderCell>
              <TableHeaderCell>Төлөв</TableHeaderCell>
              <TableHeaderCell className="text-right">Үйлдэл</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.data!.items.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="whitespace-nowrap text-body-sm-medium text-text-primary"><Link href={`/admin/invoices/${inv.id}`} className="focus-ring rounded-sm hover:text-text-brand hover:underline">{inv.invoiceNumber}</Link></TableCell>
                <TableCell className="max-w-[240px] truncate" title={inv.description}>{inv.description}</TableCell>
                <TableCell className="whitespace-nowrap text-right text-body-sm-medium text-text-primary">{formatMoney(inv.amount)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(inv.dueDate)}</TableCell>
                <TableCell className="whitespace-nowrap"><StatusBadge map={INVOICE_STATUS_BADGE} status={inv.status} /></TableCell>
                <TableCell className="py-2 text-right"><InvoiceActions invoice={inv} onChanged={onChanged} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <InvoiceModal open={createOpen} onOpenChange={setCreateOpen} caseId={caseId} onSaved={() => void onChanged()} />
    </div>
  );
}
