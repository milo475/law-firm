'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useRef, useState, type DragEvent } from 'react';
import { DocumentsIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { FileChip, fileKind } from '@/components/ui/file-chip';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type CaseListItem, type DocumentItem, type Paginated } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt';
const MAX_BYTES = 20 * 1024 * 1024;

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [caseId, setCaseId] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<{ doc: DocumentItem; url: string } | null>(null);

  const cases = useQuery({ queryKey: ['cases', 'all'], queryFn: () => api.get<Paginated<CaseListItem>>('/cases?limit=50') });
  const caseItems = useMemo(() => cases.data?.items ?? [], [cases.data]);
  const docQueries = useQueries({
    queries: caseItems.map((c) => ({ queryKey: ['case-documents', c.id], queryFn: () => api.get<DocumentItem[]>(`/cases/${c.id}/documents`) })),
  });
  const groups = caseItems
    .map((c, i) => ({ caseItem: c, documents: docQueries[i]?.data ?? [], loading: docQueries[i]?.isLoading ?? true }))
    .filter((g) => g.loading || g.documents.length > 0);
  const anyLoading = cases.isLoading || docQueries.some((q) => q.isLoading);

  const upload = useMutation({
    mutationFn: async ({ file, target }: { file: File; target: string }) => {
      const form = new FormData();
      form.append('file', file);
      return api.post<DocumentItem>(`/cases/${target}/documents`, form);
    },
    onSuccess: (doc, vars) => {
      toast.success('Амжилттай хавсаргалаа', `${doc.name} хэрэгт нэмэгдлээ.`);
      void queryClient.invalidateQueries({ queryKey: ['case-documents', vars.target] });
    },
    onError: (error) => toast.danger('Файл хуулж чадсангүй', error instanceof ApiError ? error.message : 'Дахин оролдоно уу.'),
  });

  function handleFiles(files: FileList | File[]) {
    const target = caseId || (caseItems.length === 1 ? caseItems[0].id : '');
    if (!target) { toast.warning('Хэрэг сонгоно уу', 'Баримтыг аль хэрэгт хавсаргахаа эхлээд сонгоно уу.'); return; }
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) { toast.danger('Файл хэт том байна', `${file.name} — 20MB-аас хэтэрсэн.`); continue; }
      upload.mutate({ file, target });
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) handleFiles(event.dataTransfer.files);
  }

  async function download(doc: DocumentItem) {
    try {
      const { url } = await api.get<{ url: string }>(`/documents/${doc.id}/download`);
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      toast.danger('Татаж чадсангүй', error instanceof ApiError ? error.message : 'Дахин оролдоно уу.');
    }
  }

  async function openPreview(doc: DocumentItem) {
    try {
      const { url } = await api.get<{ url: string }>(`/documents/${doc.id}/download?inline=true`);
      setPreview({ doc, url });
    } catch (error) {
      toast.danger('Урьдчилан харж чадсангүй', error instanceof ApiError ? error.message : 'Дахин оролдоно уу.');
    }
  }

  const previewable = (doc: DocumentItem) => doc.mimeType === 'application/pdf' || doc.mimeType.startsWith('image/');
  const caseOptions = caseItems.map((c) => ({ value: c.id, label: `${c.caseNumber} · ${c.title}` }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-h3">Баримт бичиг</h2>
        <p className="mt-1 text-body-sm text-text-secondary">Бүх хэргийн баримтууд нэг дор. Файлаа чирж оруулах эсвэл сонгож хавсаргана.</p>
      </div>

      {/* Upload zone */}
      <section className="flex flex-col gap-4 rounded-lg border border-border-default bg-bg-surface p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <Select label="Хэрэг" placeholder="Баримт хавсаргах хэргээ сонгоно уу" options={caseOptions} value={caseId || undefined} onValueChange={setCaseId} disabled={cases.isLoading || caseItems.length === 0} />
          <Button size="md" onClick={() => fileInput.current?.click()} disabled={upload.isPending || caseItems.length === 0}>{upload.isPending ? 'Хуулж байна…' : 'Файл сонгох'}</Button>
        </div>
        <input ref={fileInput} type="file" multiple accept={ACCEPT} className="sr-only" aria-label="Файл сонгох" onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }} />
        <div
          role="button"
          tabIndex={0}
          aria-label="Файлаа энд чирж оруулна уу"
          onClick={() => fileInput.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn('focus-ring flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors', dragging ? 'border-border-focus bg-bg-accent-soft' : 'border-border-default bg-bg-page hover:border-border-strong')}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-bg-brand-soft text-text-brand"><DocumentsIcon size={22} /></span>
          <p className="text-body-medium text-text-primary">Файлаа энд чирж оруулна уу</p>
          <p className="text-body-sm text-text-muted">PDF, Word, Excel, JPG, PNG, TXT · 20MB хүртэл</p>
        </div>
      </section>

      {/* Grouped list */}
      {cases.isError ? (
        <ErrorState message={cases.error instanceof ApiError ? cases.error.message : 'Алдаа гарлаа'} onRetry={() => void cases.refetch()} />
      ) : anyLoading ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      ) : groups.length === 0 ? (
        <EmptyState title="Баримт бичиг байхгүй байна" description="Дээрх хэсгээс эхний баримтаа хавсаргана уу." />
      ) : (
        groups.map(({ caseItem, documents }) => (
          <section key={caseItem.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-body-medium text-text-primary">
                <Link href={`/portal/cases/${caseItem.id}`} className="focus-ring rounded-sm hover:text-text-brand">{caseItem.caseNumber} · {caseItem.title}</Link>
              </h3>
              <span className="text-caption text-text-muted">{documents.length} баримт</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {documents.map((d) => (
                <FileChip
                  key={d.id}
                  name={d.name}
                  mimeType={d.mimeType}
                  meta={`${formatBytes(d.size)} · ${formatDate(d.createdAt)}`}
                  action={
                    <div className="flex shrink-0 items-center gap-1">
                      {previewable(d) && <Button variant="ghost" size="sm" onClick={() => void openPreview(d)}>Харах</Button>}
                      <Button variant="ghost" size="sm" onClick={() => void download(d)}>Татах</Button>
                    </div>
                  }
                />
              ))}
            </div>
          </section>
        ))
      )}

      {/* Preview modal */}
      <Modal open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        {preview && (
          <ModalContent
            title={preview.doc.name}
            size="lg"
            footer={<><Button variant="ghost" size="md" onClick={() => setPreview(null)}>Хаах</Button><Button size="md" onClick={() => void download(preview.doc)}>Татах</Button></>}
          >
            {fileKind(preview.doc.mimeType) === 'IMG' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt={preview.doc.name} className="max-h-[60vh] w-full rounded-md object-contain" />
            ) : (
              <iframe src={preview.url} title={preview.doc.name} className="h-[60vh] w-full rounded-md border border-border-default" />
            )}
          </ModalContent>
        )}
      </Modal>
    </div>
  );
}
