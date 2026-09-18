// Figma: 02 Client Portal / Portal / 02 Register / Desktop (28:148) + Mobile (35:968)
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard, AuthHeading, AuthSwitchLink } from '@/components/portal/auth-card';
import { RegisterForm } from './register-form';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'portal.register' });
  return { title: t('title') };
}

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('portal.register');
  return (
    <AuthCard className="md:gap-5" mobileNav={{ title: t('title'), backHref: '/portal/login' }}>
      <AuthHeading
        title={t('title')}
        mobileTitle={t('mobileTitle')}
        description={t('description')}
        descriptionClassName="text-body-sm md:text-body"
      />
      <RegisterForm />
      <AuthSwitchLink prompt={t('haveAccount')} href="/portal/login" label={t('loginCta')} />
    </AuthCard>
  );
}
