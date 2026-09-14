'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUser } from '@/components/portal/user-context';
import { Badge, caseStatusTone } from '@/components/ui/badge';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { ApiError, api, type CaseListItem, type InvoiceItem, type NotificationItem, type Paginated } from '@/lib/api';
import { CASE_STATUS_LABELS, formatDate, formatMoney } from '@/lib/format';

interface Summary {
  cases: CaseListItem[];
  openInvoices: InvoiceItem[];
  unreadCount: number;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Paginated<CaseListItem>>('/cases?limit=5'),
      api.get<Paginated<InvoiceItem>>('/invoices?limit=50'),
      api.get<{ items: NotificationItem[]; unreadCount: number }>('/notifications'),
    ])
      .then(([cases, invoices, notifications]) =>
        setSummary({
          cases: cases.items,
          openInvoices: invoices.items.filter((i) => i.status === 'SENT' || i.status === 'OVERDUE'),
          unreadCount: notifications.unreadCount,
        }),
      )
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Алдаа гарлаа'));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!summary) return <LoadingState />;

  const openAmount = summary.openInvoices.reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl">Сайн байна уу, {user.firstName}</h1>
        <p className="mt-1 text-sm text-slate-600">Таны хэргийн явц, төлбөр, мэдэгдлийн товч тойм.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Идэвхтэй хэрэг" value={String(summary.cases.filter((c) => c.status !== 'CLOSED').length)} href="/portal/cases" />
        <Stat label="Төлөгдөөгүй нэхэмжлэх" value={formatMoney(openAmount)} href="/portal/invoices" />
        <Stat label="Уншаагүй мэдэгдэл" value={String(summary.unreadCount)} href="/portal/notifications" />
      </div>

      <section className="rounded-lg border border-brand-100 bg-white">
        <div className="flex items-center justify-between border-b border-brand-100 px-5 py-3">
          <h2 className="text-lg">Сүүлийн хэргүүд</h2>
          <Link href="/portal/cases" className="text-sm text-brand-500 hover:underline">Бүгд →</Link>
        </div>
        {summary.cases.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Хэрэг бүртгэгдээгүй байна.</p>
        ) : (
          <ul className="divide-y divide-brand-100">
            {summary.cases.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div>
                  <Link href={`/portal/cases/${c.id}`} className="font-medium text-brand-900 hover:text-brand-500">{c.title}</Link>
                  <p className="text-xs text-slate-500">{c.caseNumber} · шинэчлэгдсэн {formatDate(c.updatedAt)}</p>
                </div>
                <Badge tone={caseStatusTone(c.status)}>{CASE_STATUS_LABELS[c.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-lg border border-brand-100 bg-white p-5 hover:border-brand-300">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 font-serif text-2xl text-brand-900">{value}</p>
    </Link>
  );
}
