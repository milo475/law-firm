import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/portal/auth-card';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Бүртгүүлэх' };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Бүртгүүлэх"
      description="Харилцагчийн эрхээр бүртгүүлж, хэргийн явцаа онлайнаар хянаарай."
      footer={<>Бүртгэлтэй юу? <Link href="/portal/login" className="focus-ring rounded-sm text-text-accent underline">Нэвтрэх</Link></>}
    >
      <RegisterForm />
    </AuthCard>
  );
}
