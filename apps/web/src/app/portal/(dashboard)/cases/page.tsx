'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, caseStatusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { ApiError, api, type CaseListItem, type Paginated } from '@/lib/api';
import { CASE_STATUS_LABELS, CASE_TYPE_LABELS, formatDate } from '@/lib/format';

export default function CasesPage() {
  const [data, setData] = useState<Paginated<CaseListItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Paginated<CaseListItem>>('/cases?limit=50')
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Алдаа гарлаа'));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl">Хэргүүд</h1>
        <p className="mt-1 text-sm text-slate-600">Танд хамаарах бүх хэргийн жагсаалт.</p>
      </div>

      {error ? (
        <ErrorState message={error} />
      ) : !data ? (
        <LoadingState />
      ) : data.items.length === 0 ? (
        <EmptyState message="Хэрэг бүртгэгдээгүй байна." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-brand-100 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Дугаар</th>
                <th className="px-4 py-3">Гарчиг</th>
                <th className="px-4 py-3">Төрөл</th>
                <th className="px-4 py-3">Хуульч</th>
                <th className="px-4 py-3">Төлөв</th>
                <th className="px-4 py-3">Нээгдсэн</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {data.items.map((c) => (
                <tr key={c.id} className="hover:bg-brand-50/60">
                  <td className="px-4 py-3 font-mono text-xs">{c.caseNumber}</td>
                  <td className="px-4 py-3">
                    <Link href={`/portal/cases/${c.id}`} className="font-medium text-brand-900 hover:text-brand-500">{c.title}</Link>
                  </td>
                  <td className="px-4 py-3">{CASE_TYPE_LABELS[c.type] ?? c.type}</td>
                  <td className="px-4 py-3">{c.lawyer.lastName.charAt(0)}. {c.lawyer.firstName}</td>
                  <td className="px-4 py-3"><Badge tone={caseStatusTone(c.status)}>{CASE_STATUS_LABELS[c.status]}</Badge></td>
                  <td className="px-4 py-3">{formatDate(c.openedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
