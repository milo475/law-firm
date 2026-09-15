'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { useUser } from '@/components/portal/user-context';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CONTACT_STATUS_BADGE, SERVICE_REQUEST_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { ApiError, api, type Paginated, type ServiceRequestItem } from '@/lib/api';
import type { ContactRequestItem } from '@/lib/admin';
import { CASE_TYPE_LABELS, SERVICE_REQUEST_STATUS_LABELS, SERVICE_REQUEST_TYPE_LABELS, formatDate } from '@/lib/format';
import { cn, shortName } from '@/lib/utils';

const ALL = 'ALL';
const options = (labels: Record<string, string>, all: string) => [{ value: ALL, label: all }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))];

/** ADMIN: service requests to review and assign; old contact form messages stay readable below. */
export default function AdminServiceRequestsPage() {
  const { user } = useUser();
  const isAdmin = user.role === 'ADMIN';
  const [status, setStatus] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [caseType, setCaseType] = useState(ALL);
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (status !== ALL) params.set('status', status);
  if (type !== ALL) params.set('type', type);
  if (caseType !== ALL) params.set('caseType', caseType);
  const qs = params.toString();

  const requests = useQuery({
    queryKey: ['service-requests', 'admin', qs],
    queryFn: () => api.get<Paginated<ServiceRequestItem>>(`/service-requests?${qs}`),
    placeholderData: keepPreviousData,
    enabled: isAdmin,
  });
  const legacy = useQuery({
    queryKey: ['admin', 'contact', 'legacy'],
    queryFn: () => api.get<Paginated<ContactRequestItem>>('/contact?limit=50'),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <AdminPageTitle title="Хүсэлтүүд" />
        <ErrorState title="403 — Энэ хэсэг зөвхөн админд" message="Үйлчилгээний хүсэлтийг админ хянаж, өмгөөлөгч хуваарилна." />
      </div>
    );
  }

  const filter = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(1);
  };
  const data = requests.data;
  const filtered = status !== ALL || type !== ALL || caseType !== ALL;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageTitle
        title="Хүсэлтүүд"
        description="Харилцагчдын өмгөөлөгч авах, зөвлөгөө авах хүсэлт. Хүлээж аваад өмгөөлөгч эсвэл баг хуваарилахад хэрэг нээгдэнэ."
      />
      <div className="grid gap-4 md:grid-cols-3 lg:max-w-[840px]">
        <Select label="Төлөв" value={status} onValueChange={filter(setStatus)} options={options(SERVICE_REQUEST_STATUS_LABELS, 'Бүх төлөв')} />
        <Select label="Төрөл" value={type} onValueChange={filter(setType)} options={options(SERVICE_REQUEST_TYPE_LABELS, 'Бүх төрөл')} />
        <Select label="Чиглэл" value={caseType} onValueChange={filter(setCaseType)} options={options(CASE_TYPE_LABELS, 'Бүх чиглэл')} />
      </div>

      {requests.isError ? (
        <ErrorState message={requests.error instanceof ApiError ? requests.error.message : 'Хүсэлт ачаалахад алдаа гарлаа'} onRetry={() => void requests.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={6} />
      ) : data.items.length === 0 ? (
        <EmptyState title="Хүсэлт олдсонгүй" description={filtered ? 'Шүүлтэд тохирох хүсэлт алга.' : 'Харилцагч порталаас хүсэлт илгээхэд энд харагдана.'} />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Хүсэлт</TableHeaderCell>
                  <TableHeaderCell>Харилцагч</TableHeaderCell>
                  <TableHeaderCell>Төрөл</TableHeaderCell>
                  <TableHeaderCell>Илгээсэн</TableHeaderCell>
                  <TableHeaderCell>Төлөв</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((item) => (
                  // NEW requests stand out until someone decides on them
                  <TableRow key={item.id} className={cn(item.status === 'NEW' && 'bg-status-new-bg')}>
                    <TableCell className="py-3">
                      <Link
                        href={`/admin/requests/${item.id}`}
                        className={cn('focus-ring rounded-sm text-text-primary hover:text-text-brand hover:underline', item.status === 'NEW' ? 'text-body-medium' : 'text-body')}
                      >
                        {item.title}
                      </Link>
                      <p className="text-caption text-text-muted">{CASE_TYPE_LABELS[item.caseType] ?? item.caseType}</p>
                    </TableCell>
                    <TableCell>{shortName(item.requester.firstName, item.requester.lastName)}</TableCell>
                    <TableCell>{SERVICE_REQUEST_TYPE_LABELS[item.type]}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(item.createdAt, true)}</TableCell>
                    <TableCell><StatusBadge map={SERVICE_REQUEST_STATUS_BADGE} status={item.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="flex flex-col gap-3 md:hidden">
            {data.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/requests/${item.id}`}
                  className={cn(
                    'focus-ring flex flex-col gap-2 rounded-lg border border-border-default p-4',
                    item.status === 'NEW' ? 'border-l-[3px] border-l-status-new-fg bg-status-new-bg' : 'bg-bg-surface',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-body-medium text-text-primary">{item.title}</span>
                    <StatusBadge map={SERVICE_REQUEST_STATUS_BADGE} status={item.status} className="shrink-0" />
                  </div>
                  <span className="text-caption text-text-muted">
                    {shortName(item.requester.firstName, item.requester.lastName)} · {SERVICE_REQUEST_TYPE_LABELS[item.type]} · {formatDate(item.createdAt, true)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination className="justify-center" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}

      {legacy.data && legacy.data.total > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="legacy">
            <AccordionTrigger>Хуучин «Холбоо барих» маягтын мессежүүд ({legacy.data.total})</AccordionTrigger>
            <AccordionContent>
              <p className="pb-3 text-body-sm text-text-muted">
                Маягтыг хүсэлтийн урсгалаар сольсон. Эдгээрийг зөвхөн харах боломжтой — шаардлагатай бол харилцагчаар бүртгээд холбогдоно уу.
              </p>
              <ul className="flex flex-col divide-y divide-border-default">
                {legacy.data.items.map((item) => (
                  <li key={item.id} className="flex flex-col gap-1 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-body-medium text-text-primary">{item.subject}</span>
                      <StatusBadge map={CONTACT_STATUS_BADGE} status={item.status} />
                    </div>
                    <p className="whitespace-pre-line text-body-sm text-text-secondary">{item.message}</p>
                    <p className="text-caption text-text-muted">
                      {item.name} · {item.phone}{item.email ? ` · ${item.email}` : ''} · {formatDate(item.createdAt, true)}
                    </p>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
