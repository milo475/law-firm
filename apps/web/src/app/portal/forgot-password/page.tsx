import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/portal/auth-card';
import { ForgotPasswordForm } from './forgot-form';

export const metadata: Metadata = { title: 'Нууц үг сэргээх' };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Нууц үг сэргээх"
      description="Бүртгэлтэй и-мэйл хаягаа оруулбал сэргээх заавар илгээнэ."
      footer={<Link href="/portal/login" className="focus-ring rounded-sm text-text-accent underline">← Нэвтрэх хуудас руу</Link>}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
