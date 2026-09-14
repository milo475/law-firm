'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRef } from 'react';
import { useUser } from '@/components/portal/user-context';
import { CASE_STATUS_BADGE, INVOICE_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileChip } from '@/components/ui/file-chip';
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type CaseDetail, type CaseEvent, type DocumentItem, type InvoiceItem, type Paginated } from '@/lib/api';
import { CASE_EVENT_LABELS, CASE_TYPE_LABELS, INVOICE_STATUS_LABELS, formatBytes, formatDate, formatMoney } from '@/lib/format';
import { shortName } from '@/lib/utils';

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const detail = useQuery({ queryKey: ['case', id], queryFn: () => api.get<CaseDetail>(`/cases/${id}`), retry: false });
  const events = useQuery({ queryKey: ['case-events', id], queryFn: () => api.get<CaseEvent[]>(`/cases/${id}/events`), enabled: detail.isSuccess });
  const documents = useQuery({ queryKey: ['case-documents', id], queryFn: () => api.get<DocumentItem[]>(`/cases/${id}/documents`), enabled: detail.isSuccess });
  const invoices = useQuery({ queryKey: ['invoices', 'case', id], queryFn: () => api.get<Paginated<InvoiceItem>>(`/invoices?caseId=${id}&limit=50`), enabled: detail.isSuccess });

  const upload = useMutation({
    mutationFn: (file: File) => { const form = new FormData(); form.append('file', file); return api.post<DocumentItem>(`/cases/${id}/documents`, form); },
    onSuccess: (doc) => { toast.success('Амжилттай хавсаргалаа', `${doc.name} хэрэгт нэмэгдлээ.`); void queryClient.invalidateQueries({ queryKey: ['case-documents', id] }); },
    onError: (error) => toast.danger('Файл хуулж чадсангүй', error instanceof ApiError ? error.message : 'Дахин оролдоно уу.'),
  });

  async function download(doc: DocumentItem) {
    try {
      const { url } = await api.get<{ url: string }>(`/documents/${doc.id}/download`);
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      toast.danger('Татаж чадсангүй', error instanceof ApiError ? error.message : 'Дахин оролдоно уу.');
    }
  }

  if (detail.isError) {
    const err = detail.error;
    const forbidden = err instanceof ApiError && err.status === 403;
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb items={[{ label: 'Хэргүүд', href: '/portal/cases' }, { label: forbidden ? 'Хандах эрхгүй' : 'Олдсонгүй' }]} />
        <ErrorState title={forbidden ? '403 — Энэ хэргийг үзэх эрх танд байхгүй' : '404 — Хэрэг олдсонгүй'} message={err instanceof ApiError ? err.message : 'Алдаа гарлаа'} />
        <div><Button asChild variant="secondary" size="sm"><Link href="/portal/cases">Хэргүүд рүү буцах</Link></Button></div>
      </div>
    );
  }
  if (!detail.data) {
    return <div className="flex flex-col gap-6"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-2/3" /><CardSkeleton /></div>;
  }
  const c = detail.data;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Портал', href: '/portal' }, { label: 'Хэргүүд', href: '/portal/cases' }, { label: c.caseNumber }]} />
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-caption text-text-muted">{c.caseNumber}</span>
          <StatusBadge map={CASE_STATUS_BADGE} status={c.status} />
        </div>
        <h2 className="text-h3 md:text-h2">{c.title}</h2>
        <p className="text-body-sm text-text-secondary">
          {CASE_TYPE_LABELS[c.type] ?? c.type} · нээгдсэн {formatDate(c.openedAt)}{c.closedAt ? ` · хаагдсан ${formatDate(c.closedAt)}` : ''} · хуульч {shortName(c.lawyer.firstName, c.lawyer.lastName)}
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Тойм</TabsTrigger>
          <TabsTrigger value="timeline">Явцын түүх</TabsTrigger>
          <TabsTrigger value="documents">Баримт</TabsTrigger>
          <TabsTrigger value="invoices">Нэхэмжлэх</TabsTrigger>
          <TabsTrigger value="messages">Мессеж</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card className="flex flex-col gap-4 p-6">
              <h3 className="text-h4">Хэргийн тайлбар</h3>
              <p className="text-body text-text-secondary">{c.description ?? 'Тайлбар оруулаагүй байна.'}</p>
              <dl className="grid gap-4 border-t border-border-subtle pt-4 sm:grid-cols-3">
                <Fact label="Үйл явдал" value={String(c._count.events)} />
                <Fact label="Баримт" value={String(c._count.documents)} />
                <Fact label="Нэхэмжлэх" value={String(c._count.invoices)} />
              </dl>
            </Card>
            <div className="flex flex-col gap-4">
              <Card className="flex flex-col gap-3 p-6">
                <p className="text-caption text-text-muted">Хариуцсан хуульч</p>
                <p className="text-body-medium text-text-primary">{shortName(c.lawyer.firstName, c.lawyer.lastName)}</p>
                <a href={`mailto:${(c.lawyer as { email?: string }).email ?? ''}`} className="focus-ring rounded-sm text-body-sm text-text-accent hover:underline">{(c.lawyer as { email?: string }).email}</a>
              </Card>
              <Card className="flex flex-col gap-3 p-6">
                <p className="text-caption text-text-muted">Харилцагч</p>
                <p className="text-body-medium text-text-primary">{shortName(c.client.firstName, c.client.lastName)}</p>
                {user.role !== 'CLIENT' && <p className="text-body-sm text-text-secondary">{(c.client as { email?: string }).email}</p>}
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          {events.isLoading ? <Skeleton className="h-40" /> : (events.data?.length ?? 0) === 0 ? (
            <EmptyState title="Бүртгэгдсэн үйл явдал байхгүй" />
          ) : (
            <ol className="relative flex flex-col gap-4 border-l-2 border-border-default pl-6">
              {events.data!.map((e) => (
                <li key={e.id} className="relative rounded-lg border border-border-default bg-bg-surface p-5">
                  <span aria-hidden className="absolute -left-[31px] top-6 size-3 rounded-full border-2 border-bg-page bg-accent-default" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-overline text-text-accent">{CASE_EVENT_LABELS[e.type] ?? e.type}</p>
                    <span className="text-caption text-text-muted">{formatDate(e.eventDate, true)}</span>
                  </div>
                  <p className="mt-2 text-body-medium text-text-primary">{e.title}</p>
                  {e.description && <p className="mt-1 text-body-sm text-text-secondary">{e.description}</p>}
                  <p className="mt-2 text-caption text-text-muted">{shortName(e.createdBy.firstName, e.createdBy.lastName)}</p>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="documents">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-body-sm text-text-secondary">PDF, Word, Excel, зураг, текст — 20MB хүртэл.</p>
              <input ref={fileInput} type="file" accept={ACCEPT} className="sr-only" aria-label="Файл сонгох" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />
              <Button size="sm" onClick={() => fileInput.current?.click()} disabled={upload.isPending}>{upload.isPending ? 'Хуулж байна…' : 'Баримт хавсаргах'}</Button>
            </div>
            {documents.isLoading ? <Skeleton className="h-32" /> : (documents.data?.length ?? 0) === 0 ? (
              <EmptyState title="Баримт хавсаргаагүй байна" action={<Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()}>Эхний баримтаа хавсаргах</Button>} />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {documents.data!.map((d) => (
                  <FileChip key={d.id} name={d.name} mimeType={d.mimeType} meta={`${formatBytes(d.size)} · ${formatDate(d.createdAt)}`} action={<Button variant="ghost" size="sm" onClick={() => void download(d)}>Татах</Button>} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          {invoices.isLoading ? <Skeleton className="h-32" /> : (invoices.data?.items.length ?? 0) === 0 ? (
            <EmptyState title="Нэхэмжлэх байхгүй" />
          ) : (
            <Table>
              <TableHead><TableRow><TableHeaderCell>Дугаар</TableHeaderCell><TableHeaderCell>Тайлбар</TableHeaderCell><TableHeaderCell className="text-right">Дүн</TableHeaderCell><TableHeaderCell>Төлөх хугацаа</TableHeaderCell><TableHeaderCell>Статус</TableHeaderCell></TableRow></TableHead>
              <TableBody>
                {invoices.data!.items.map((inv) => (
                  <TableRow key={inv.id} interactive>
                    <TableCell className="text-body-sm-medium text-text-primary"><Link href={`/portal/invoices/${inv.id}`} className="focus-ring rounded-sm">{inv.invoiceNumber}</Link></TableCell>
                    <TableCell>{inv.description}</TableCell>
                    <TableCell className="text-right text-body-sm-medium text-text-primary">{formatMoney(inv.amount)}</TableCell>
                    <TableCell>{formatDate(inv.dueDate)}</TableCell>
                    <TableCell><StatusBadge map={INVOICE_STATUS_BADGE} status={inv.status} /><span className="sr-only">{INVOICE_STATUS_LABELS[inv.status]}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="messages">
          <EmptyState title="Тун удахгүй" description="Хуульчтайгаа портал дээрээс шууд харилцах мессежийн хэсэг удахгүй нээгдэнэ. Одоогоор и-мэйл, утсаар холбогдоно уу." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className="font-serif text-h4 text-text-brand">{value}</dd>
    </div>
  );
}
