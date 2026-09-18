// Figma: 02 Client Portal / Portal / 01 Login / Desktop (28:34) + Mobile (35:928); 01b Login OTP / Desktop (28:94)
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { AuthCard } from '@/components/portal/auth-card';
import { LoginForm } from './login-form';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'portal.login' });
  return { title: t('title') };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AuthCard>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
