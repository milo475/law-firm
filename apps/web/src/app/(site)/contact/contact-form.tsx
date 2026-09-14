'use client';

import { useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; message: string } | { kind: 'error'; message: string };

export function ContactForm() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    if (!data.email) delete data.email;

    setStatus({ kind: 'sending' });
    try {
      const result = await api.post<{ message: string }>('/contact', data);
      setStatus({ kind: 'done', message: result.message });
      form.reset();
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof ApiError ? error.message : 'Илгээхэд алдаа гарлаа' });
    }
  }

  const field = 'mt-1 w-full rounded-md border border-brand-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-brand-900">
          Нэр
          <input name="name" required minLength={2} className={field} />
        </label>
        <label className="block text-sm font-medium text-brand-900">
          Утас
          <input name="phone" required pattern="(\+976)?[0-9]{8}" placeholder="99112233" className={field} />
        </label>
      </div>
      <label className="block text-sm font-medium text-brand-900">
        И-мэйл (заавал биш)
        <input name="email" type="email" className={field} />
      </label>
      <label className="block text-sm font-medium text-brand-900">
        Сэдэв
        <input name="subject" required minLength={3} className={field} />
      </label>
      <label className="block text-sm font-medium text-brand-900">
        Мессеж
        <textarea name="message" required minLength={10} rows={5} className={field} />
      </label>

      {status.kind === 'done' && <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{status.message}</p>}
      {status.kind === 'error' && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{status.message}</p>}

      <button
        type="submit"
        disabled={status.kind === 'sending'}
        className="rounded-md bg-brand-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {status.kind === 'sending' ? 'Илгээж байна…' : 'Хүсэлт илгээх'}
      </button>
    </form>
  );
}
