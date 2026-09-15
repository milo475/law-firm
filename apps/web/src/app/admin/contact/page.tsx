'use client';

import { CONTACT_STATUS_TRANSITIONS } from '@law-firm/shared/schemas';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { useUser } from '@/components/portal/user-context';
import { CONTACT_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type Paginated } from '@/lib/api';
import type { ContactRequestItem, ContactStatus } from '@/lib/admin';
import { formatDate } from '@/lib/format';

const ACTION_LABELS: Record<ContactStatus, string> = { NEW: 'Шинэ', CONTACTED: 'Холбогдсон гэж тэмдэглэх', CLOSED: 'Хүсэлтийг хаах' };

function ContactRequestsContent() {
  const { user } = useUser();
  const isAdmin = user.role === 'ADMIN';
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('NEW');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ContactRequestItem | null>(null);
  const focusId = searchParams.get('focus');

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (status !== 'ALL') params.set('status', status);
  const requests = useQuery({
    queryKey: ['admin', 'contact', { status, page }],
    queryFn: () => api.get<Paginated<ContactRequestItem>>(`/contact?${params.toString()}`),
    placeholderData: keepPreviousData,
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!focusId || !requests.data) return;
    const match = requests.data.items.find((item) => item.id === focusId);
    if (match) setSelected(match);
  }, [focusId, requests.data]);

  const update = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ContactStatus }) => api.patch<ContactRequestItem>(`/contact/${id}`, { status: next }),
    onSuccess: async (updated) => {
      toast.success('Хүсэлтийн төлөв шинэчлэгдлээ', CONTACT_STATUS_BADGE[updated.status]?.label);
      setSelected(updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'contact'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ]);
    },
    onError: (error) => toast.danger('Төлөв солиход алдаа гарлаа', error instanceof ApiError ? error.message : undefined),
  });

  if (!isAdmin) {
    return <ErrorState title="403 — Энэ хэсэг зөвхөн админд" message="Холбоо барих хүсэлтүүдийг админ хариуцна." />;
  }

  const data = requests.data;
  const next = selected ? CONTACT_STATUS_TRANSITIONS[selected.status] : [];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageTitle title="Хүсэлтүүд" description="Нийтийн сайтын «Холбоо барих» формоор ирсэн хүсэлтүүд." />
      <Select
        wrapperClassName="md:max-w-[260px]"
        label="Төлөв"
        value={status}
        onValueChange={(v) => { setStatus(v); setPage(1); }}
        options={[{ value: 'ALL', label: 'Бүгд' }, ...Object.entries(CONTACT_STATUS_BADGE).map(([value, { label }]) => ({ value, label }))]}
      />

      {requests.isError ? (
        <ErrorState message={requests.error instanceof ApiError ? requests.error.message : 'Хүсэлт ачаалахад алдаа гарлаа'} onRetry={() => void requests.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={5} />
      ) : data.items.length === 0 ? (
        <EmptyState title={status === 'NEW' ? 'Шинэ хүсэлт алга' : 'Хүсэлт олдсонгүй'} />
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-border-default overflow-hidden rounded-lg border border-border-default bg-bg-surface">
            {data.items.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => setSelected(item)} className="focus-ring flex w-full flex-col gap-2 px-5 py-4 text-left transition-colors hover:bg-bg-brand-soft md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-body-medium text-text-primary">{item.subject}</span>
                    <span className="line-clamp-1 text-body-sm text-text-secondary">{item.message}</span>
                    <span className="text-caption text-text-muted">{item.name} · {item.phone}{item.email ? ` · ${item.email}` : ''} · {formatDate(item.createdAt, true)}</span>
                  </div>
                  <StatusBadge map={CONTACT_STATUS_BADGE} status={item.status} className="self-start md:self-center" />
                </button>
              </li>
            ))}
          </ul>
          <Pagination className="justify-center" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}

      <Modal open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (
          <ModalContent
            title={selected.subject}
            footer={
              <>
                <Button variant="ghost" size="md" onClick={() => setSelected(null)}>Хаах</Button>
                {next.map((status) => (
                  <Button key={status} variant={status === 'CLOSED' ? 'secondary' : 'primary'} size="md" disabled={update.isPending} onClick={() => update.mutate({ id: selected.id, next: status })}>
                    {ACTION_LABELS[status]}
                  </Button>
                ))}
              </>
            }
          >
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge map={CONTACT_STATUS_BADGE} status={selected.status} />
              <span className="text-caption text-text-muted">{formatDate(selected.createdAt, true)}</span>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div><dt className="text-caption text-text-muted">Нэр</dt><dd className="text-body text-text-primary">{selected.name}</dd></div>
              <div><dt className="text-caption text-text-muted">Утас</dt><dd><a href={`tel:${selected.phone}`} className="focus-ring rounded-sm text-body text-text-accent hover:underline">{selected.phone}</a></dd></div>
              {selected.email && <div className="sm:col-span-2"><dt className="text-caption text-text-muted">И-мэйл</dt><dd><a href={`mailto:${selected.email}`} className="focus-ring rounded-sm text-body text-text-accent hover:underline">{selected.email}</a></dd></div>}
            </dl>
            <p className="whitespace-pre-line rounded-md bg-bg-page p-4 text-body text-text-primary">{selected.message}</p>
            {selected.status === 'CLOSED' && <p className="text-body-sm text-text-muted">Хаагдсан хүсэлтийн төлөвийг буцаах боломжгүй.</p>}
            <Link href="/admin/clients" className="focus-ring self-start rounded-sm text-body-sm text-text-accent hover:underline">Харилцагч болгон бүртгэх →</Link>
          </ModalContent>
        )}
      </Modal>
    </div>
  );
}

export default function AdminContactPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={5} />}>
      <ContactRequestsContent />
    </Suspense>
  );
}
