// Figma: 02 Client Portal / Portal / 02 Register / Desktop (28:148) + Mobile (35:968)
import type { Metadata } from 'next';
import { AuthCard, AuthHeading, AuthSwitchLink } from '@/components/portal/auth-card';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Бүртгүүлэх' };

export default function RegisterPage() {
  return (
    <AuthCard className="md:gap-5" mobileNav={{ title: 'Бүртгүүлэх', backHref: '/portal/login' }}>
      <AuthHeading
        title="Бүртгүүлэх"
        mobileTitle="Бүртгэл үүсгэх"
        description="Гэрээ байгуулсан харилцагчид портал ашиглах эрхтэй."
        descriptionClassName="text-body-sm md:text-body"
      />
      <RegisterForm />
      <AuthSwitchLink prompt="Бүртгэлтэй юу?" href="/portal/login" label="Нэвтрэх" />
    </AuthCard>
  );
}
