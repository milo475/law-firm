import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthCard } from '@/components/portal/auth-card';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Нэвтрэх' };

export default function LoginPage() {
  return (
    <AuthCard
      title="Нэвтрэх"
      description="И-мэйл эсвэл утасны дугаараараа нэвтэрнэ үү."
      footer={<>Бүртгэлгүй юу? <Link href="/portal/register" className="focus-ring rounded-sm text-text-accent underline">Бүртгүүлэх</Link></>}
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
