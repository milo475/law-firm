'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setError(null);
    setPending(true);
    try {
      await api.post('/auth/login', data);
      const next = searchParams.get('next');
      router.replace(next && next.startsWith('/portal') ? next : '/portal');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Нэвтрэхэд алдаа гарлаа');
      setPending(false);
    }
  }

  const field = 'mt-1 w-full rounded-md border border-brand-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-sm font-medium text-brand-900">
        И-мэйл эсвэл утас
        <input name="identifier" required autoComplete="username" className={field} />
      </label>
      <label className="block text-sm font-medium text-brand-900">
        Нууц үг
        <input name="password" type="password" required autoComplete="current-password" className={field} />
      </label>
      {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? 'Нэвтэрч байна…' : 'Нэвтрэх'}
      </button>
      <p className="text-center text-xs text-slate-500">
        Нууц үгээ мартсан бол манай оффистой холбогдоно уу.
      </p>
    </form>
  );
}
