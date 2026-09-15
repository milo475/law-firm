// Figma: 02 Client Portal / Portal / 06 Documents / Desktop (31:577) + Mobile (36:1181); preview modal: 06b Document Preview / Desktop (32:517)
'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Fragment, useMemo, useRef, useState, type DragEvent } from 'react';
import { CloseIcon, DownloadIcon, EyeIcon, UploadCircleIcon } from '@/components/icons';
import { useUser } from '@/components/portal/user-context';
import { Button } from '@/components/ui/button';
import { FileChip, fileKind } from '@/components/ui/file-chip';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type CaseListItem, type DocumentItem, type Paginated, type PublicUser } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/format';
import { cn, shortName } from '@/lib/utils';

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt';
const MAX_BYTES = 20 * 1024 * 1024;

type Kind = ReturnType<typeof fileKind>;
/** Same colours as FileChip's extension tile (not exported) — used for the 36px table / preview tiles. */
const KIND_TILE: Record<Kind, string> = {
  PDF: 'bg-danger-100 text-danger-700',
  DOCX: 'bg-info-100 text-info-700',
  XLSX: 'bg-success-100 text-success-700',
  IMG: 'bg-success-100 text-success-700',
  TXT: 'bg-bg-surface-alt text-text-secondary',
  FILE: 'bg-bg-surface-alt text-text-secondary',
};
/** "Төрөл" column — the API has no document category, so the file kind is shown instead. */
const KIND_LABEL: Record<Kind, string> = {
  PDF: 'PDF баримт',
  DOCX: 'Word баримт',
  XLSX: 'Excel хүснэгт',
  IMG: 'Зураг',
  TXT: 'Текст',
  FILE: 'Файл',
};

const previewable = (doc: DocumentItem) => doc.mimeType === 'application/pdf' || doc.mimeType.startsWith('image/');

export default function DocumentsPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [caseId, setCaseId] = useState<string>('');
  const [filter, setFilter] = useState('ALL');
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
  const allDocs = docQueries.flatMap((q) => q.data ?? []);
  const totalSize = allDocs.reduce((sum, d) => sum + d.size, 0);
  const visibleGroups = filter === 'ALL' ? groups : groups.filter((g) => g.caseItem.id === filter);
  const showGroupHeaders = filter === 'ALL' && visibleGroups.length > 1;

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
    // Explicit Select choice → the case chip being viewed → the only case
    const target = caseId || (filter !== 'ALL' ? filter : '') || (caseItems.length === 1 ? caseItems[0].id : '');
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

  /** Desktop "Б. Дэлгэрмаа (хуульч)" / "Г. Батбаяр (та)"; mobile "Б. Дэлгэрмаа" / "Та". */
  function uploaderLabel(u: PublicUser, compact = false) {
    const name = shortName(u.firstName, u.lastName);
    if (u.id === user.id) return compact ? 'Та' : `${name} (та)`;
    if (compact) return name;
    return u.role === 'LAWYER' ? `${name} (хуульч)` : name;
  }

  const pickFile = () => fileInput.current?.click();
  const caseOptions = caseItems.map((c) => ({ value: c.id, label: `${c.caseNumber} · ${c.title}` }));
  const filterOptions = [{ value: 'ALL', label: 'Бүгд', title: undefined as string | undefined }, ...caseItems.map((c) => ({ value: c.id, label: c.caseNumber, title: c.title }))];

  const actions = (d: DocumentItem) => (
    <div className="flex shrink-0 items-center gap-1.5">
      {previewable(d) ? (
        <IconAction label={`Урьдчилан харах: ${d.name}`} title="Харах" onClick={() => void openPreview(d)}><EyeIcon /></IconAction>
      ) : (
        <span aria-hidden className="size-11" />
      )}
      <IconAction label={`Татах: ${d.name}`} title="Татах" onClick={() => void download(d)}><DownloadIcon /></IconAction>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 md:gap-4">
      {/* Header (31:592) — desktop only; mobile relies on the portal header title */}
      <div className="hidden items-center justify-between gap-6 md:flex">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-h2">Баримт бичиг</h2>
          <p className="text-body text-text-secondary">{anyLoading ? 'Ачааллаж байна…' : `Нийт ${allDocs.length} файл · ${formatBytes(totalSize)}`}</p>
        </div>
        <Button size="md" onClick={pickFile} disabled={upload.isPending || caseItems.length === 0}>{upload.isPending ? 'Хуулж байна…' : 'Файл нэмэх'}</Button>
      </div>

      {/* Upload (31:599 / 36:1193) — full-bleed white strip on mobile */}
      <section aria-label="Файл хавсаргах" className="-mx-5 -mt-6 flex flex-col gap-4 bg-bg-surface p-5 md:mx-0 md:mt-0 md:bg-transparent md:p-0">
        <Select label="Хэрэг" placeholder="Баримт хавсаргах хэргээ сонгоно уу" options={caseOptions} value={caseId || undefined} onValueChange={setCaseId} disabled={cases.isLoading || caseItems.length === 0} wrapperClassName="md:max-w-[480px]" />
        <input ref={fileInput} type="file" multiple accept={ACCEPT} className="sr-only" aria-label="Файл сонгох" onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }} />
        <div
          role="button"
          tabIndex={0}
          aria-label="Файлаа энд чирж оруулна уу, эсвэл товшиж компьютерээсээ сонгоно уу"
          onClick={pickFile}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickFile(); } }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'focus-ring flex cursor-pointer flex-col items-center gap-2 rounded-lg border-[1.5px] border-dashed px-4 py-7 text-center transition-colors md:gap-2.5 md:py-10',
            dragging ? 'border-border-focus bg-bg-accent-soft' : 'border-border-brand bg-bg-brand-soft hover:bg-navy-100',
          )}
        >
          <UploadCircleIcon className="size-11 text-text-brand md:size-12" />
          <p className="text-body-medium text-text-brand md:text-h4">
            <span className="md:hidden">Файл нэмэх</span>
            <span className="hidden md:inline">Файлаа энд чирж оруулна уу</span>
          </p>
          <p className="text-caption text-text-secondary md:text-body-sm">
            <span className="md:hidden">PDF, DOCX, JPG · 20MB хүртэл</span>
            <span className="hidden md:inline">эсвэл товшиж компьютерээсээ сонгоно уу · PDF, DOCX, JPG, PNG · 20MB хүртэл</span>
          </p>
          {upload.isPending && <p role="status" className="text-caption text-text-brand">Хуулж байна…</p>}
        </div>
      </section>

      {/* Files (31:605 / 36:1199) */}
      <section aria-labelledby="all-files" className="flex flex-col gap-3.5 md:gap-4 md:pt-2">
        <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="flex items-center justify-between gap-3">
            <h3 id="all-files" className="font-serif text-[20px] font-semibold leading-7 md:text-h4">Бүх файл</h3>
            {!anyLoading && <span className="text-caption text-text-muted md:hidden">{allDocs.length} файл · {formatBytes(totalSize)}</span>}
          </div>
          {caseItems.length > 1 && (
            <div role="radiogroup" aria-label="Хэргээр шүүх" className="flex flex-wrap gap-2.5">
              {filterOptions.map((opt) => {
                const active = opt.value === filter;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    title={opt.title}
                    onClick={() => setFilter(opt.value)}
                    className={cn(
                      'focus-ring inline-flex h-11 items-center justify-center rounded-full px-4 text-body-sm-medium transition-colors',
                      active ? 'bg-brand-primary text-text-on-inverse' : 'border border-border-default bg-bg-surface text-text-secondary hover:bg-bg-brand-soft',
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {cases.isError ? (
          <ErrorState message={cases.error instanceof ApiError ? cases.error.message : 'Алдаа гарлаа'} onRetry={() => void cases.refetch()} />
        ) : anyLoading ? (
          <>
            <div className="hidden md:block"><TableSkeleton /></div>
            <div className="flex flex-col gap-3.5 md:hidden"><Skeleton className="h-[62px]" /><Skeleton className="h-[62px]" /><Skeleton className="h-[62px]" /></div>
          </>
        ) : visibleGroups.length === 0 ? (
          <EmptyState title="Баримт бичиг байхгүй байна" description="Дээрх хэсгээс эхний баримтаа хавсаргана уу." />
        ) : (
          <>
            {/* Desktop — Figma "Table" (31:619): 48px header, 64px file rows */}
            <div className="hidden md:block">
              <Table>
                <TableHead>
                  <TableRow className="h-12">
                    <TableHeaderCell className="h-12 w-[420px]">Файлын нэр</TableHeaderCell>
                    <TableHeaderCell className="h-12 w-[160px]">Төрөл</TableHeaderCell>
                    <TableHeaderCell className="h-12 w-[220px]">Оруулсан</TableHeaderCell>
                    <TableHeaderCell className="h-12 w-[160px]">Огноо</TableHeaderCell>
                    <TableHeaderCell className="h-12 w-[100px]">Үйлдэл</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleGroups.map(({ caseItem, documents }) => (
                    <Fragment key={caseItem.id}>
                      {showGroupHeaders && (
                        <TableRow className="h-11 bg-bg-page">
                          <TableCell colSpan={5} className="h-11 text-caption text-text-muted">
                            <Link href={`/portal/cases/${caseItem.id}`} className="focus-ring rounded-sm text-text-secondary hover:text-text-brand">{caseItem.caseNumber} · {caseItem.title}</Link>
                            {' '}· {documents.length} баримт
                          </TableCell>
                        </TableRow>
                      )}
                      {documents.map((d) => (
                        <TableRow key={d.id} interactive className="h-16">
                          <TableCell className="h-16">
                            <div className="flex items-center gap-3">
                              <KindTile doc={d} />
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <p className="break-words text-body-sm-medium text-text-primary">{d.name}</p>
                                <p className="text-caption text-text-muted">{formatBytes(d.size)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="h-16 whitespace-nowrap">{KIND_LABEL[fileKind(d.mimeType, d.name)]}</TableCell>
                          <TableCell className="h-16 whitespace-nowrap">{uploaderLabel(d.uploadedBy)}</TableCell>
                          <TableCell className="h-16 whitespace-nowrap">{formatDate(d.createdAt)}</TableCell>
                          <TableCell className="h-16 py-0">{actions(d)}</TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile — Figma "File chip" list (36:1212) */}
            <div className="flex flex-col gap-3.5 md:hidden">
              {visibleGroups.map(({ caseItem, documents }) => (
                <div key={caseItem.id} className="flex flex-col gap-3.5">
                  {showGroupHeaders && (
                    <Link href={`/portal/cases/${caseItem.id}`} className="focus-ring flex min-h-11 items-center rounded-sm text-caption text-text-muted hover:text-text-brand">
                      <span className="truncate">{caseItem.caseNumber} · {caseItem.title}</span>
                    </Link>
                  )}
                  {documents.map((d) => (
                    <FileChip
                      key={d.id}
                      name={d.name}
                      mimeType={d.mimeType}
                      meta={`${formatBytes(d.size)} · ${uploaderLabel(d.uploadedBy, true)} · ${formatDate(d.createdAt)}`}
                      action={<div className="-my-0.5 -mr-2">{actions(d)}</div>}
                    />
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Preview modal — Figma "Preview modal" (32:519), built on Radix Dialog because ModalContent's header/footer differ */}
      <DialogPrimitive.Root open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        {preview && (
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-900/55 data-[state=open]:animate-in data-[state=open]:fade-in" />
            <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex h-[min(720px,calc(100vh-32px))] w-[calc(100vw-32px)] max-w-[880px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-bg-surface shadow-modal focus:outline-none">
              {/* Header (32:520): ext tile + name / meta, 44px close */}
              <div className="flex min-h-[76px] shrink-0 items-center justify-between gap-4 border-b border-border-default py-3 pl-6 pr-4">
                <div className="flex min-w-0 items-center gap-3">
                  <KindTile doc={preview.doc} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <DialogPrimitive.Title className="truncate text-body-medium text-text-primary">{preview.doc.name}</DialogPrimitive.Title>
                    <DialogPrimitive.Description className="text-caption text-text-muted">
                      {formatBytes(preview.doc.size)} · {uploaderLabel(preview.doc.uploadedBy, true)} оруулсан · {formatDate(preview.doc.createdAt)}
                    </DialogPrimitive.Description>
                  </div>
                </div>
                <DialogPrimitive.Close className="focus-ring inline-flex size-11 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface-alt" aria-label="Хаах">
                  <CloseIcon size={44} />
                </DialogPrimitive.Close>
              </div>
              {/* Preview (32:529): surface-alt stage with the document "page" */}
              <div className="flex min-h-0 flex-1 items-center justify-center bg-bg-surface-alt p-5">
                {fileKind(preview.doc.mimeType) === 'IMG' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.url} alt={preview.doc.name} className="max-h-full max-w-full bg-bg-surface object-contain shadow-menu" />
                ) : (
                  <iframe src={preview.url} title={preview.doc.name} className="size-full bg-bg-surface shadow-menu" />
                )}
              </div>
              {/* Footer (32:541): case note + Хаах / Татаж авах */}
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border-default bg-bg-surface px-6 py-4">
                {(() => {
                  const owner = caseItems.find((c) => c.id === preview.doc.caseId);
                  return owner ? <p className="text-body-sm text-text-muted">Энэ баримт {owner.caseNumber} хэрэгт хамаарна</p> : <span />;
                })()}
                <div className="ml-auto flex gap-3">
                  <Button variant="ghost" size="md" onClick={() => setPreview(null)}>Хаах</Button>
                  <Button size="md" onClick={() => void download(preview.doc)}>Татаж авах</Button>
                </div>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </DialogPrimitive.Root>
    </div>
  );
}

function KindTile({ doc }: { doc: DocumentItem }) {
  const kind = fileKind(doc.mimeType, doc.name);
  return <span aria-hidden className={cn('flex size-9 shrink-0 items-center justify-center rounded-sm text-caption', KIND_TILE[kind])}>{kind}</span>;
}

/** Figma File row "Action" (31:645): 44×44 icon button, text-secondary glyph. */
function IconAction({ label, title, onClick, children }: { label: string; title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="icon" aria-label={label} title={title} onClick={onClick} className="text-text-secondary hover:text-text-brand">
      {children}
    </Button>
  );
}
