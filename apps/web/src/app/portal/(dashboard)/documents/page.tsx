'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { ApiError, api, type CaseListItem, type DocumentItem, type Paginated } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/format';

interface Group {
  caseItem: CaseListItem;
  documents: DocumentItem[];
}

export default function DocumentsPage() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cases = await api.get<Paginated<CaseListItem>>('/cases?limit=50');
        const withDocs = await Promise.all(
          cases.items.map(async (caseItem) => ({
            caseItem,
            documents: await api.get<DocumentItem[]>(`/cases/${caseItem.id}/documents`),
          })),
        );
        setGroups(withDocs.filter((g) => g.documents.length > 0));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Алдаа гарлаа');
      }
    })();
  }, []);

  async function download(documentId: string) {
    try {
      const { url } = await api.get<{ url: string }>(`/documents/${documentId}/download`);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Татахад алдаа гарлаа');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl">Баримт бичиг</h1>
        <p className="mt-1 text-sm text-slate-600">Хэрэг тус бүрээр бүлэглэсэн баримтууд. Шинэ баримтыг хэргийн хуудаснаас хавсаргана.</p>
      </div>
      {message && <p className="text-sm text-red-700">{message}</p>}
      {error ? (
        <ErrorState message={error} />
      ) : !groups ? (
        <LoadingState />
      ) : groups.length === 0 ? (
        <EmptyState message="Баримт бичиг байхгүй байна." />
      ) : (
        groups.map(({ caseItem, documents }) => (
          <section key={caseItem.id} className="rounded-lg border border-brand-100 bg-white">
            <div className="border-b border-brand-100 px-4 py-3">
              <Link href={`/portal/cases/${caseItem.id}`} className="font-medium text-brand-900 hover:text-brand-500">
                {caseItem.caseNumber} · {caseItem.title}
              </Link>
            </div>
            <ul className="divide-y divide-brand-100">
              {documents.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-brand-900">{doc.name}</p>
                    <p className="text-xs text-slate-500">{formatBytes(doc.size)} · {formatDate(doc.createdAt)}</p>
                  </div>
                  <button type="button" onClick={() => void download(doc.id)} className="text-brand-500 hover:underline">Татах</button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
