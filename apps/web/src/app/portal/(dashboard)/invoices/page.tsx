'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, invoiceStatusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { ApiError, api, type InvoiceItem, type Paginated } from '@/lib/api';
import { INVOICE_STATUS_LABELS, formatDate, formatMoney } from '@/lib/format';

export default function InvoicesPage() {
  const [data, setData] = useState<Paginated<InvoiceItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Paginated<InvoiceItem>>('/invoices?limit=50')
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Алдаа гарлаа'));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl">Нэхэмжлэх</h1>
        <p className="mt-1 text-sm text-slate-600">Төлбөрийн нэхэмжлэхүүд ба тэдгээрийн төлөв.</p>
      </div>
      {error ? (
        <ErrorState message={error} />
      ) : !data ? (
        <LoadingState />
      ) : data.items.length === 0 ? (
        <EmptyState message="Нэхэмжлэх байхгүй байна." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-brand-100 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Дугаар</th>
                <th className="px-4 py-3">Хэрэг</th>
                <th className="px-4 py-3">Тайлбар</th>
                <th className="px-4 py-3 text-right">Дүн</th>
                <th className="px-4 py-3">Төлөх хугацаа</th>
                <th className="px-4 py-3">Төлөв</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {data.items.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">
                    <Link href={`/portal/cases/${inv.case.id}`} className="text-brand-900 hover:text-brand-500">{inv.case.caseNumber}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{inv.description}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(inv.amount)}</td>
                  <td className="px-4 py-3">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3"><Badge tone={invoiceStatusTone(inv.status)}>{INVOICE_STATUS_LABELS[inv.status]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
