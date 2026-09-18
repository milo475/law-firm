// Figma: 02 Client Portal / Portal / 04 Cases / Desktop (30:187) + Mobile (35:1120)
'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Suspense, useEffect, useState } from 'react';
import { SearchIcon } from '@/components/icons';
import { CASE_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { ApiError, api, type CaseListItem, type Paginated } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { cn, shortName } from '@/lib/utils';

const PAGE_SIZE = 20;
// Figma toolbar chips: Бүгд / Явагдаж буй / Хүлээгдэж буй / Хаагдсан (+ Шинэ, since the API has that status)
const STATUS_VALUES = ['ALL', 'NEW', 'IN_PROGRESS', 'WAITING', 'CLOSED'] as const;

export default function CasesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <CasesPageContent />
    </Suspense>
  );
}

function CasesPageContent() {
  const t = useTranslations('portal.cases');
  const tStatus = useTranslations('enums.caseStatus');
  const tType = useTranslations('enums.caseType');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  // `?q=` comes from the portal header search box
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [debounced, setDebounced] = useState(search);
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { const q = searchParams.get('q') ?? ''; setSearch(q); setDebounced(q.trim()); }, [searchParams]);

  const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
  if (status !== 'ALL') params.set('status', status);
  if (debounced) params.set('search', debounced);
  const query = useQuery({
    queryKey: ['cases', status, debounced, page],
    queryFn: () => api.get<Paginated<CaseListItem>>(`/cases?${params.toString()}`),
  });
  // Unfiltered list for the header summary (shares the dashboard cache key)
  const all = useQuery({ queryKey: ['cases', 'all'], queryFn: () => api.get<Paginated<CaseListItem>>('/cases?limit=50') });
  const allItems = all.data?.items ?? [];
  const counts = {
    active: allItems.filter((c) => c.status === 'NEW' || c.status === 'IN_PROGRESS').length,
    waiting: allItems.filter((c) => c.status === 'WAITING').length,
    closed: allItems.filter((c) => c.status === 'CLOSED').length,
  };

  const changeStatus = (value: string) => { setStatus(value); setPage(1); };
  const changeSearch = (value: string) => { setSearch(value); setPage(1); };

  const data = query.data;
  const from = data && data.total > 0 ? (data.page - 1) * data.limit + 1 : 0;
  const to = data ? Math.min(data.page * data.limit, data.total) : 0;

  return (
    <div className="flex flex-col gap-4 md:gap-2">
      {/* Header — desktop only (mobile relies on the portal header title) */}
      <div className="hidden items-center justify-between gap-6 md:flex md:pb-1.5">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-h2">{t('title')}</h2>
          <p className="text-body text-text-secondary">
            {all.isLoading
              ? t('loading')
              : t('summary', { total: all.data?.total ?? allItems.length, active: counts.active, waiting: counts.waiting, closed: counts.closed })}
          </p>
        </div>
        <Button asChild size="md"><Link href="/portal/requests/new">{t('newRequest')}</Link></Button>
      </div>

      {/* Toolbar — search + status chips; full-bleed white strip on mobile */}
      <div className="-mx-5 -mt-6 flex flex-col gap-4 bg-bg-surface p-5 md:mx-0 md:mt-0 md:flex-row md:items-center md:justify-between md:bg-transparent md:p-0 md:py-2">
        <label className="flex h-11 w-full items-center gap-2.5 rounded-md border border-border-default bg-bg-page px-3.5 focus-within:border-2 focus-within:border-border-focus focus-within:px-[13px] md:w-[360px] md:bg-bg-surface">
          <SearchIcon size={16} className="shrink-0 text-text-muted" />
          <span className="sr-only">{t('searchLabel')}</span>
          <input
            type="search"
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder={t('searchLabel')}
            className="w-full bg-transparent text-body-sm text-text-primary outline-none placeholder:text-text-muted"
          />
        </label>
        <div role="radiogroup" aria-label={t('filterByStatus')} className="flex flex-wrap gap-2.5">
          {STATUS_VALUES.map((value) => {
            const active = value === status;
            const label = value === 'ALL' ? t('all') : tStatus(value);
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => changeStatus(value)}
                className={cn(
                  'focus-ring inline-flex h-11 items-center justify-center rounded-full px-4 text-body-sm-medium transition-colors md:px-[18px]',
                  active ? 'bg-brand-primary text-text-on-inverse' : 'border border-border-default bg-bg-page text-text-secondary hover:bg-bg-brand-soft md:bg-bg-surface',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {query.isError ? (
        <ErrorState message={query.error instanceof ApiError ? query.error.message : t('loadError')} onRetry={() => void query.refetch()} />
      ) : query.isLoading || !data ? (
        <TableSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState title={t('noneTitle')} description={status === 'ALL' && !debounced ? t('noneDescription') : t('noneFiltered')} />
      ) : (
        <>
          {/* Desktop table — Figma "Table row" 6 columns (140/320/180/200/160/160) */}
          <div className="hidden flex-col gap-2 md:flex md:pt-2">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="w-[140px]">{t('columns.number')}</TableHeaderCell>
                  <TableHeaderCell>{t('columns.title')}</TableHeaderCell>
                  <TableHeaderCell className="w-[180px]">{t('columns.type')}</TableHeaderCell>
                  <TableHeaderCell className="w-[200px]">{t('columns.lawyer')}</TableHeaderCell>
                  <TableHeaderCell className="w-[160px]">{t('columns.status')}</TableHeaderCell>
                  <TableHeaderCell className="w-[160px]">{t('columns.updated')}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow key={c.id} interactive className="cursor-pointer" onClick={() => router.push(`/portal/cases/${c.id}`)}>
                    <TableCell>{c.caseNumber}</TableCell>
                    <TableCell className="text-body-sm-medium text-text-primary">
                      <Link href={`/portal/cases/${c.id}`} className="focus-ring rounded-sm" onClick={(e) => e.stopPropagation()}>{c.title}</Link>
                    </TableCell>
                    <TableCell>{tType(c.type) ?? c.type}</TableCell>
                    <TableCell>{shortName(c.lawyer.firstName, c.lawyer.lastName)}</TableCell>
                    <TableCell><StatusBadge map={CASE_STATUS_BADGE} status={c.status} label={tStatus(c.status)} /></TableCell>
                    <TableCell>{formatDate(c.updatedAt, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-body-sm text-text-muted">{t('range', { from, to, total: data.total })}</p>
              <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
            </div>
          </div>

          {/* Mobile — Figma "Case row" cards */}
          <div className="flex flex-col gap-3.5 md:hidden">
            <p className="text-caption text-text-muted">{t('totalCount', { count: data.total })}</p>
            {data.items.map((c) => <CaseRow key={c.id} item={c} />)}
            <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} className="justify-center pt-2" />
          </div>
        </>
      )}
    </div>
  );
}

/** Figma "Case row" (35:1147): number + badge / title / lawyer + updated date. */
function CaseRow({ item }: { item: CaseListItem }) {
  const locale = useLocale() as Locale;
  const tStatus = useTranslations('enums.caseStatus');
  return (
    <Link href={`/portal/cases/${item.id}`} className="focus-ring flex flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-[18px] transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption text-text-muted">{item.caseNumber}</span>
        <StatusBadge map={CASE_STATUS_BADGE} status={item.status} label={tStatus(item.status)} />
      </div>
      <p className="text-body-medium text-text-primary">{item.title}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-body-sm text-text-secondary">{shortName(item.lawyer.firstName, item.lawyer.lastName)}</span>
        <span className="text-caption text-text-muted">{formatDate(item.updatedAt, locale)}</span>
      </div>
    </Link>
  );
}
