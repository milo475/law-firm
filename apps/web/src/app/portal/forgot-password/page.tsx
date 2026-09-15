// Figma: 02 Client Portal / Portal / 02b Password Reset / Desktop (28:215) — mobile follows 01 Login / Mobile (35:928)
import type { Metadata } from 'next';
import { AuthBackLink, AuthCard, AuthHeading } from '@/components/portal/auth-card';
import { ForgotPasswordForm } from './forgot-form';

export const metadata: Metadata = { title: 'Нууц үг сэргээх' };

export default function ForgotPasswordPage() {
  return (
    <AuthCard>
      <AuthBackLink label="Нэвтрэх рүү буцах" href="/portal/login" />
      <AuthHeading title="Нууц үг сэргээх" description="Бүртгэлтэй утас эсвэл имэйлээ оруулбал сэргээх холбоос илгээнэ." />
      <ForgotPasswordForm />
    </AuthCard>
  );
}
