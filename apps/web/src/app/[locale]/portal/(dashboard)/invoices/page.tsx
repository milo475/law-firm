// Figma: 02 Client Portal / Portal / 07 Invoices / Desktop (32:548) + Mobile (36:1263)
'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { ApiError, api, type InvoiceItem, type Paginated } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { InvoiceDetailPanel, InvoiceStatusBadge, PORTAL_INVOICE_BADGE, PaymentModal, isPayable } from './invoice-panel';

// Status chips (same pattern as the cases toolbar) — labels follow the client-facing badge copy.
const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Бүгд' },
  ...['SENT', 'AWAITING_CONFIRMATION', 'OVERDUE', 'PAID', 'CANCELLED', 'DRAFT'].map((value) => ({ value, label: PORTAL_INVOICE_BADGE[value].label })),
];

// The side "Invoice detail" panel needs the 1180px desktop main column; below that, cards link to the detail route.
const WIDE_QUERY = '(min-width: 1280px)';
const subscribeWide = (onChange: () => void) => {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
const useIsWide = () => useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE_QUERY).matches, () => false);

const sumOf = (items: InvoiceItem[]) => items.reduce((s, i) => s + Number(i.amount), 0);

/** Unpaid first (soonest due), then the rest by most recent payment / due date — as ordered in Figma. */
function sortInvoices(items: InvoiceItem[]) {
  return [...items].sort((a, b) => {
    const pa = isPayable(a), pb = isPayable(b);
    if (pa !== pb) return pa ? -1 : 1;
    if (pa) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    return new Date(b.paidAt ?? b.dueDate).getTime() - new Date(a.paidAt ?? a.dueDate).getTime();
  });
}

export default function InvoicesPage() {
  const isWide = useIsWide();
  const [status, setStatus] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payInvoice, setPayInvoice] = useState<InvoiceItem | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  // Unfiltered list for the summary cards (shares the dashboard cache key)
  const all = useQuery({ queryKey: ['invoices', 'all'], queryFn: () => api.get<Paginated<InvoiceItem>>('/invoices?limit=50') });
  const query = useQuery({
    queryKey: status === 'ALL' ? ['invoices', 'all'] : ['invoices', status],
    queryFn: () => api.get<Paginated<InvoiceItem>>(`/invoices?limit=50${status !== 'ALL' ? `&status=${status}` : ''}`),
  });

  const allItems = all.data?.items ?? [];
  const totals = all.data
    ? {
        billed: sumOf(allItems.filter((i) => i.status !== 'DRAFT' && i.status !== 'CANCELLED')),
        paid: sumOf(allItems.filter((i) => i.status === 'PAID')),
        outstanding: sumOf(allItems.filter(isPayable)),
      }
    : null;

  const items = sortInvoices(query.data?.items ?? []);
  const selected = items.find((i) => i.id === selectedId) ?? items.find(isPayable) ?? items[0];

  const openPay = (invoice: InvoiceItem) => { setPayInvoice(invoice); setPayOpen(true); };

  return (
    <div className="flex flex-col gap-5 md:gap-0">
      {/* Header — desktop only (mobile relies on the portal header title) */}
      <div className="hidden flex-col gap-3 pb-2 md:flex">
        <h2 className="text-h2">Нэхэмжлэх ба төлбөр</h2>
        <p className="text-body text-text-secondary">Хэрэг тус бүрээр үүссэн нэхэмжлэх, төлбөрийн түүхээ эндээс хянана.</p>
      </div>

      {/* Summary — 3 "Sum card"s on desktop; full-bleed white strip with 2 sums on mobile */}
      {!all.isError && (
        <section aria-label="Төлбөрийн хураангуй" className="-mx-5 -mt-6 bg-bg-surface p-5 md:mx-0 md:mt-0 md:bg-transparent md:px-0 md:py-2">
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
            <SumCard className="hidden md:flex" label="Нийт нэхэмжилсэн" value={totals?.billed ?? null} tone="total" />
            <SumCard label="Төлөгдсөн" value={totals?.paid ?? null} tone="paid" />
            <SumCard
              label={<><span className="md:hidden">Үлдэгдэл</span><span className="hidden md:inline">Төлөгдөөгүй үлдэгдэл</span></>}
              value={totals?.outstanding ?? null}
              tone="due"
            />
          </dl>
        </section>
      )}

      <div className="flex flex-col gap-6 md:pt-4 xl:flex-row xl:items-start">
        <section aria-labelledby="invoices-heading" className="flex min-w-0 flex-1 flex-col gap-3.5 md:gap-4">
          <h3 id="invoices-heading" className="font-serif text-[20px] font-semibold leading-7 text-text-primary md:text-h4">Бүх нэхэмжлэх</h3>

          <div role="radiogroup" aria-label="Төлөвөөр шүүх" className="flex flex-wrap gap-2.5">
            {STATUS_OPTIONS.map((opt) => {
              const active = opt.value === status;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    'focus-ring inline-flex h-11 items-center justify-center rounded-full px-4 text-body-sm-medium transition-colors md:px-[18px]',
                    active ? 'bg-brand-primary text-text-on-inverse' : 'border border-border-default bg-bg-surface text-text-secondary hover:bg-bg-brand-soft',
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {query.isError ? (
            <ErrorState message={query.error instanceof ApiError ? query.error.message : 'Алдаа гарлаа'} onRetry={() => void query.refetch()} />
          ) : query.isLoading ? (
            <div className="flex flex-col gap-3.5 md:gap-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
          ) : items.length === 0 ? (
            <EmptyState
              title="Нэхэмжлэх байхгүй байна"
              description={status === 'ALL' ? 'Таны хэрэгт нэхэмжлэх үүсмэгц энд харагдана.' : 'Энэ төлөвт тохирох нэхэмжлэх байхгүй.'}
            />
          ) : (
            <ul className="flex flex-col gap-3.5 md:gap-4">
              {items.map((inv) => (
                <li key={inv.id}>
                  <InvoiceCard
                    invoice={inv}
                    selectable={isWide}
                    selected={isWide && selected?.id === inv.id}
                    onSelect={() => setSelectedId(inv.id)}
                    onPay={() => openPay(inv)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Figma "Detail" column (344px) — selected invoice, wide desktop only */}
        {selected && !query.isLoading && !query.isError && (
          <aside aria-label="Сонгосон нэхэмжлэх" className="sticky top-[96px] hidden w-[344px] shrink-0 xl:block">
            <InvoiceDetailPanel invoice={selected} as="h3" titleHref={`/portal/invoices/${selected.id}`} onPay={() => openPay(selected)} />
          </aside>
        )}
      </div>

      <PaymentModal invoice={payInvoice} open={payOpen} onOpenChange={setPayOpen} />
    </div>
  );
}

const SUM_TONE = {
  total: 'text-text-primary',
  paid: 'text-status-progress-fg',
  due: 'text-status-danger-fg',
} as const;

/** Figma "Sum card" (32:568) desktop · "Sum" (36:1277) mobile. */
function SumCard({ label, value, tone, className }: { label: React.ReactNode; value: number | null; tone: keyof typeof SUM_TONE; className?: string }) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-lg bg-bg-page p-4 md:gap-2 md:border md:border-border-default md:bg-bg-surface md:p-6',
        tone === 'due' && 'md:bg-status-pending-bg',
        className,
      )}
    >
      <dt className="text-caption text-text-muted md:text-body-sm md:text-text-secondary">{label}</dt>
      <dd>
        {value === null ? (
          <Skeleton className="h-7 w-24 md:h-11 md:w-40" />
        ) : (
          <span className={cn('block truncate font-serif text-[20px] font-semibold leading-7 md:text-h2', SUM_TONE[tone])}>{formatMoney(value)}</span>
        )}
      </dd>
    </div>
  );
}

/** Figma "Invoice" card (32:583 desktop · 36:1285 mobile). Unpaid invoices get the 1.5px status outline. */
function InvoiceCard({ invoice, selectable, selected, onSelect, onPay }: { invoice: InvoiceItem; selectable: boolean; selected: boolean; onSelect: () => void; onPay: () => void }) {
  const payable = isPayable(invoice);
  const dateLine =
    invoice.status === 'PAID' && invoice.paidAt
      ? `Төлсөн: ${formatDate(invoice.paidAt)}`
      : invoice.status === 'AWAITING_CONFIRMATION' && invoice.paymentMarkedAt
        ? `Төлбөр тэмдэглэсэн: ${formatDate(invoice.paymentMarkedAt)} · баталгаажуулж байна`
        : `Эцсийн хугацаа: ${formatDate(invoice.dueDate)}`;
  // Stretched hit area: the number control covers the whole card; the pay buttons sit above it (z-10).
  const stretched = 'focus-ring rounded-sm text-left text-body-sm-medium text-text-primary after:absolute after:inset-0 after:rounded-lg';

  return (
    <article
      className={cn(
        'relative flex flex-col gap-3 rounded-lg border bg-bg-surface p-[18px] transition-colors md:px-6 md:py-5',
        invoice.status === 'OVERDUE'
          ? 'border-[1.5px] border-status-danger-fg'
          : payable
            ? 'border-[1.5px] border-status-pending-fg'
            : 'border-border-default hover:border-border-strong',
        selected && 'shadow-menu',
        selected && !payable && 'border-border-brand hover:border-border-brand',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {selectable ? (
          <button type="button" aria-pressed={selected} onClick={onSelect} className={stretched}>
            {invoice.invoiceNumber}
            <span className="sr-only"> — дэлгэрэнгүйг харах</span>
          </button>
        ) : (
          <Link href={`/portal/invoices/${invoice.id}`} className={stretched}>{invoice.invoiceNumber}</Link>
        )}
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      <p className="text-caption text-text-secondary md:text-body-sm">{invoice.description} · {invoice.case.caseNumber}</p>

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 md:flex-col md:items-start md:justify-start md:gap-0.5">
          <p className="font-serif text-[20px] font-semibold leading-7 text-text-primary md:text-h4">{formatMoney(invoice.amount)}</p>
          <p className="text-caption text-text-muted">{dateLine}</p>
        </div>
        {payable && (
          <Button size="sm" className="relative z-10 hidden md:inline-flex" onClick={onPay}>Төлбөр төлөх</Button>
        )}
      </div>

      {payable && (
        <Button size="md" className="relative z-10 w-full md:hidden" onClick={onPay}>Төлбөр төлөх</Button>
      )}
    </article>
  );
}
