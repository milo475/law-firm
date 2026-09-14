import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Нэвтрэх' };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-brand-50 px-4 py-16">
      <div className="w-full max-w-md rounded-lg border border-brand-100 bg-white p-8 shadow-sm">
        <Link href="/" className="font-serif text-lg font-semibold text-brand-900">Хуулийн фирм</Link>
        <h1 className="mt-4 text-2xl">Харилцагчийн портал</h1>
        <p className="mt-1 text-sm text-slate-600">И-мэйл эсвэл утасны дугаараараа нэвтэрнэ үү.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
