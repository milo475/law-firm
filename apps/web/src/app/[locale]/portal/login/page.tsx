// Figma: 02 Client Portal / Portal / 01 Login / Desktop (28:34) + Mobile (35:928); 01b Login OTP / Desktop (28:94)
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthCard } from '@/components/portal/auth-card';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Нэвтрэх' };

export default function LoginPage() {
  return (
    <AuthCard>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
