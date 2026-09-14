'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Badge, caseStatusTone, invoiceStatusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { ApiError, api, type CaseDetail, type CaseEvent, type DocumentItem, type InvoiceItem, type Paginated } from '@/lib/api';
import { CASE_EVENT_LABELS, CASE_STATUS_LABELS, CASE_TYPE_LABELS, INVOICE_STATUS_LABELS, formatBytes, formatDate, formatMoney } from '@/lib/format';

interface Bundle {
  detail: CaseDetail;
  events: CaseEvent[];
  documents: DocumentItem[];
  invoices: InvoiceItem[];
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [detail, events, documents, invoices] = await Promise.all([
        api.get<CaseDetail>(`/cases/${id}`),
        api.get<CaseEvent[]>(`/cases/${id}/events`),
        api.get<DocumentItem[]>(`/cases/${id}/documents`),
        api.get<Paginated<InvoiceItem>>(`/invoices?caseId=${id}&limit=50`),
      ]);
      setBundle({ detail, events, documents, invoices: invoices.items });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Алдаа гарлаа');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function download(documentId: string) {
    try {
      const { url } = await api.get<{ url: string }>(`/documents/${documentId}/download`);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      setUploadMessage(err instanceof ApiError ? err.message : 'Татахад алдаа гарлаа');
    }
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    setUploadMessage('Илгээж байна…');
    try {
      await api.post(`/cases/${id}/documents`, form);
      setUploadMessage('Баримт амжилттай хавсаргалаа.');
      await load();
    } catch (err) {
      setUploadMessage(err instanceof ApiError ? err.message : 'Хавсаргахад алдаа гарлаа');
    } finally {
      event.target.value = '';
    }
  }

  if (error) return <ErrorState message={error} />;
  if (!bundle) return <LoadingState />;
  const { detail, events, documents, invoices } = bundle;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/portal/cases" className="text-sm text-brand-500 hover:underline">← Хэргүүд</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl md:text-3xl">{detail.title}</h1>
          <Badge tone={caseStatusTone(detail.status)}>{CASE_STATUS_LABELS[detail.status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {detail.caseNumber} · {CASE_TYPE_LABELS[detail.type] ?? detail.type} · нээгдсэн {formatDate(detail.openedAt)}
          {detail.closedAt && ` · хаагдсан ${formatDate(detail.closedAt)}`}
        </p>
        {detail.description && <p className="mt-3 max-w-3xl text-slate-700">{detail.description}</p>}
        <p className="mt-3 text-sm text-slate-600">
          Хариуцсан хуульч: <span className="font-medium text-brand-900">{detail.lawyer.lastName.charAt(0)}. {detail.lawyer.firstName}</span>
        </p>
      </div>

      <section>
        <h2 className="text-xl">Хэргийн явц</h2>
        {events.length === 0 ? (
          <div className="mt-3"><EmptyState message="Бүртгэгдсэн үйл явдал байхгүй." /></div>
        ) : (
          <ol className="mt-4 space-y-3 border-l-2 border-brand-100 pl-5">
            {events.map((event) => (
              <li key={event.id} className="relative rounded-lg border border-brand-100 bg-white p-4">
                <span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-white bg-brand-500" aria-hidden />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-brand-900">{event.title}</p>
                  <span className="text-xs text-slate-500">{formatDate(event.eventDate, true)}</span>
                </div>
                <p className="mt-1 text-xs uppercase tracking-wide text-accent-600">{CASE_EVENT_LABELS[event.type] ?? event.type}</p>
                {event.description && <p className="mt-2 text-sm text-slate-600">{event.description}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl">Баримт бичиг</h2>
          <label className="cursor-pointer rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Баримт хавсаргах
            <input type="file" className="hidden" onChange={upload} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt" />
          </label>
        </div>
        {uploadMessage && <p className="mt-2 text-sm text-slate-600">{uploadMessage}</p>}
        {documents.length === 0 ? (
          <div className="mt-3"><EmptyState message="Баримт хавсаргаагүй байна." /></div>
        ) : (
          <ul className="mt-4 divide-y divide-brand-100 rounded-lg border border-brand-100 bg-white">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-brand-900">{doc.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatBytes(doc.size)} · {formatDate(doc.createdAt)} · {doc.uploadedBy.lastName.charAt(0)}. {doc.uploadedBy.firstName}
                  </p>
                </div>
                <button type="button" onClick={() => void download(doc.id)} className="text-brand-500 hover:underline">
                  Татах
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl">Нэхэмжлэх</h2>
        {invoices.length === 0 ? (
          <div className="mt-3"><EmptyState message="Нэхэмжлэх байхгүй." /></div>
        ) : (
          <ul className="mt-4 divide-y divide-brand-100 rounded-lg border border-brand-100 bg-white">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-brand-900">{inv.invoiceNumber} — {formatMoney(inv.amount)}</p>
                  <p className="text-xs text-slate-500">{inv.description} · төлөх хугацаа {formatDate(inv.dueDate)}</p>
                </div>
                <Badge tone={invoiceStatusTone(inv.status)}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
