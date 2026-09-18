// ADMIN, LAWYER: review what clients wrote, add what arrived elsewhere, and publish — with consent on record.
'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { revalidateTestimonials } from '@/components/admin/revalidate';
import { PublishTestimonialModal, TestimonialFormModal } from '@/components/admin/testimonial-modals';
import { StarIcon } from '@/components/icons';
import { Badge, TESTIMONIAL_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type AdminTestimonial, type Paginated } from '@/lib/api';
import { CASE_TYPE_LABELS, TESTIMONIAL_SOURCE_LABELS, TESTIMONIAL_STATUS_LABELS, formatDate } from '@/lib/format';
import { TESTIMONIALS_KEY } from '@/lib/testimonials';
import { cn } from '@/lib/utils';

const ALL = 'ALL';
const options = (labels: Record<string, string>, all: string) => [
  { value: ALL, label: all },
  ...Object.entries(labels).map(([value, label]) => ({ value, label })),
];

export default function AdminTestimonialsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [caseType, setCaseType] = useState(ALL);
  const [page, setPage] = useState(1);
  const [publishing, setPublishing] = useState<AdminTestimonial | null>(null);
  const [editing, setEditing] = useState<AdminTestimonial | null>(null);
  const [adding, setAdding] = useState(false);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (status !== ALL) params.set('status', status);
  if (source !== ALL) params.set('source', source);
  if (caseType !== ALL) params.set('caseType', caseType);
  const qs = params.toString();

  const list = useQuery({
    queryKey: ['testimonials', 'admin', qs],
    queryFn: () => api.get<Paginated<AdminTestimonial>>(`/admin/testimonials?${qs}`),
    placeholderData: keepPreviousData,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: TESTIMONIALS_KEY });
    // The public pages are ISR-cached; ask them to rebuild instead of waiting out the window.
    await revalidateTestimonials();
  };

  const patch = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => api.patch<AdminTestimonial>(`/admin/testimonials/${id}`, body),
    onSuccess: async () => {
      toast.success('Хадгаллаа');
      await refresh();
    },
    onError: (error) => toast.danger('Хадгалж чадсангүй', error instanceof ApiError ? error.message : 'Дахин оролдоно уу.'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/testimonials/${id}`),
    onSuccess: async () => {
      toast.success('Устгалаа');
      await refresh();
    },
    onError: (error) => toast.danger('Устгаж чадсангүй', error instanceof ApiError ? error.message : 'Дахин оролдоно уу.'),
  });

  const filter = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(1);
  };
  const data = list.data;
  const filtered = status !== ALL || source !== ALL || caseType !== ALL;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageTitle
        title="Сэтгэгдэл"
        description="Харилцагчдын сэтгэгдэл. Нийтлэхийн өмнө нэрийг нь нийтлэх зөвшөөрлийг баталгаажуулна."
        actions={<Button size="md" onClick={() => setAdding(true)}>Гараар нэмэх</Button>}
      />

      <div className="grid gap-4 md:grid-cols-3 lg:max-w-[840px]">
        <Select label="Төлөв" value={status} onValueChange={filter(setStatus)} options={options(TESTIMONIAL_STATUS_LABELS, 'Бүх төлөв')} />
        <Select label="Эх сурвалж" value={source} onValueChange={filter(setSource)} options={options(TESTIMONIAL_SOURCE_LABELS, 'Бүх эх сурвалж')} />
        <Select label="Чиглэл" value={caseType} onValueChange={filter(setCaseType)} options={options(CASE_TYPE_LABELS, 'Бүх чиглэл')} />
      </div>

      {list.isError ? (
        <ErrorState message={list.error instanceof ApiError ? list.error.message : 'Сэтгэгдэл ачаалахад алдаа гарлаа'} onRetry={() => void list.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={5} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={filtered ? 'Энэ шүүлтүүрт тохирох сэтгэгдэл алга' : 'Сэтгэгдэл алга байна'}
          description={filtered ? 'Өөр шүүлтүүр сонгоно уу.' : 'Харилцагч порталаас сэтгэгдэл үлдээх, эсвэл гаднаас ирсэн сэтгэгдлийг гараар нэмэх боломжтой.'}
          action={filtered ? undefined : <Button size="md" onClick={() => setAdding(true)}>Гараар нэмэх</Button>}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {data.items.map((item) => (
              <li key={item.id}>
                <article className="flex flex-col gap-3.5 rounded-lg border border-border-default bg-bg-surface p-5 md:p-6">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <StatusBadge map={TESTIMONIAL_STATUS_BADGE} status={item.status} />
                    <Badge tone="new" dot={false}>{TESTIMONIAL_SOURCE_LABELS[item.source]}</Badge>
                    {item.isFeatured && <Badge tone="progress" dot={false}>Нүүрэнд</Badge>}
                    {!item.consentGiven && <Badge tone="danger" dot={false}>Зөвшөөрөлгүй</Badge>}
                    <span className="ml-auto text-caption text-text-muted">{formatDate(item.createdAt, 'mn', true)}</span>
                  </div>

                  <p className="whitespace-pre-line text-body text-text-secondary">{item.body}</p>

                  <dl className="flex flex-wrap gap-x-6 gap-y-1.5 text-body-sm">
                    <div className="flex gap-2">
                      <dt className="text-text-muted">Зохиогч:</dt>
                      <dd className="text-text-primary">
                        {item.authorName}
                        {item.authorTitle ? ` · ${item.authorTitle}` : ''}
                      </dd>
                    </div>
                    {item.case && (
                      <div className="flex gap-2">
                        <dt className="text-text-muted">Хэрэг:</dt>
                        <dd className="text-text-primary">{item.case.caseNumber} · {item.case.title}</dd>
                      </div>
                    )}
                    {item.caseType && (
                      <div className="flex gap-2">
                        <dt className="text-text-muted">Чиглэл:</dt>
                        <dd className="text-text-primary">{CASE_TYPE_LABELS[item.caseType] ?? item.caseType}</dd>
                      </div>
                    )}
                    {item.rating !== null && (
                      <div className="flex items-center gap-2">
                        <dt className="text-text-muted">Үнэлгээ:</dt>
                        <dd className="flex items-center gap-0.5" aria-label={`5-аас ${item.rating} од`}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <StarIcon key={star} aria-hidden className={cn('size-3.5', star <= (item.rating ?? 0) ? 'text-accent-default' : 'text-border-default')} />
                          ))}
                        </dd>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <dt className="text-text-muted">Эрэмбэ:</dt>
                      <dd className="text-text-primary">{item.displayOrder}</dd>
                    </div>
                  </dl>

                  {item.consentNote && <p className="text-caption text-text-muted">Зөвшөөрөл: {item.consentNote}</p>}

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {item.status !== 'PUBLISHED' && (
                      <Button size="sm" onClick={() => setPublishing(item)}>Нийтлэх</Button>
                    )}
                    {item.status === 'PUBLISHED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={patch.isPending}
                        onClick={() => patch.mutate({ id: item.id, status: 'PENDING' })}
                      >
                        Нийтлэхийг болих
                      </Button>
                    )}
                    {item.status !== 'REJECTED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={patch.isPending}
                        onClick={() => patch.mutate({ id: item.id, status: 'REJECTED' })}
                      >
                        Татгалзах
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => setEditing(item)}>Засах</Button>
                    {item.status === 'PUBLISHED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={patch.isPending}
                        onClick={() => patch.mutate({ id: item.id, isFeatured: !item.isFeatured })}
                      >
                        {item.isFeatured ? 'Нүүрнээс хасах' : 'Нүүрэнд гаргах'}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={patch.isPending}
                      onClick={() => patch.mutate({ id: item.id, displayOrder: Math.max(0, item.displayOrder - 1) })}
                    >
                      ↑ Дээш
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={patch.isPending}
                      onClick={() => patch.mutate({ id: item.id, displayOrder: item.displayOrder + 1 })}
                    >
                      ↓ Доош
                    </Button>
                    <Button variant="danger" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(item.id)}>
                      Устгах
                    </Button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
          <Pagination className="justify-center" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}

      <PublishTestimonialModal
        testimonial={publishing}
        open={publishing !== null}
        onOpenChange={(value) => !value && setPublishing(null)}
        onPublished={() => {
          setPublishing(null);
          void refresh();
        }}
      />
      <TestimonialFormModal
        testimonial={editing}
        open={adding || editing !== null}
        onOpenChange={(value) => {
          if (!value) {
            setAdding(false);
            setEditing(null);
          }
        }}
        onSaved={() => {
          setAdding(false);
          setEditing(null);
          void refresh();
        }}
      />
    </div>
  );
}
