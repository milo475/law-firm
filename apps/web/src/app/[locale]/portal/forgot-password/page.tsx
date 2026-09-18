// Figma: 02 Client Portal / Portal / 02b Password Reset / Desktop (28:215) — mobile follows 01 Login / Mobile (35:928)
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthBackLink, AuthCard, AuthHeading } from '@/components/portal/auth-card';
import { ForgotPasswordForm } from './forgot-form';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'portal.forgotPassword' });
  return { title: t('title') };
}

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('portal.forgotPassword');
  return (
    <AuthCard>
      <AuthBackLink label={t('back')} href="/portal/login" />
      <AuthHeading title={t('title')} description={t('description')} />
      <ForgotPasswordForm />
    </AuthCard>
  );
}
