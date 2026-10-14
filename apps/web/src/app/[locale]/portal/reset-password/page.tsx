import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthBackLink, AuthCard, AuthHeading } from '@/components/portal/auth-card';
import { SetPasswordForm } from '@/components/portal/set-password-form';
import { Suspense } from 'react';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'portal.resetPassword' });
  // A one-time link is not something a search engine should follow or keep.
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tLogin] = await Promise.all([
    getTranslations('portal.resetPassword'),
    getTranslations('portal.forgotPassword'),
  ]);
  return (
    <AuthCard>
      <AuthBackLink label={tLogin('back')} href="/portal/login" />
      <AuthHeading title={t('title')} description={t('description')} />
      <Suspense>
        <SetPasswordForm mode="reset" />
      </Suspense>
    </AuthCard>
  );
}
