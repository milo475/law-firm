// Figma: 02 Client Portal / Portal / 10 Profile / Desktop (33:806) + Mobile (37:1292)
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChangePasswordSchema, PhoneSchema, type ChangePasswordInput } from '@law-firm/shared/schemas';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUser } from '@/components/portal/user-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type CaseListItem, type CurrentUser, type Paginated } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/i18n/routing';
import { cn, initials, shortName } from '@/lib/utils';

const ProfileSchema = z.object({
  lastName: z.string().trim().min(2, 'Овог хамгийн багадаа 2 тэмдэгт байна').max(64),
  firstName: z.string().trim().min(2, 'Нэр хамгийн багадаа 2 тэмдэгт байна').max(64),
  phone: z.union([PhoneSchema, z.literal('')]),
});
type ProfileInput = z.infer<typeof ProfileSchema>;

// Figma adds "Шинэ нууц үг давтах"; the confirmation is checked client-side and never sent.
const PasswordFormSchema = ChangePasswordSchema.and(z.object({ confirmPassword: z.string() })).refine(
  (d) => d.newPassword === d.confirmPassword,
  { message: 'Шинэ нууц үг таарахгүй байна', path: ['confirmPassword'] },
);
type PasswordFormInput = ChangePasswordInput & { confirmPassword: string };

// Figma notification settings — the API has no preference storage yet, so these render disabled ("coming soon").
const NOTIFICATION_SETTINGS = [
  { key: 'caseUpdates', on: true },
  { key: 'newDocuments', on: true },
  { key: 'invoices', on: true },
  { key: 'messages', on: true },
  { key: 'marketing', on: false },
];

const formatDateTime = (iso: string | null | undefined, locale: Locale) => (iso ? formatDate(iso, locale, true).replace(' ', ', ') : '—');

export default function ProfilePage() {
  const t = useTranslations('portal.profile');
  const tRole = useTranslations('enums.role');
  const locale = useLocale() as Locale;
  const { user, refresh, logout } = useUser();
  // /auth/me returns the full SafeUser (incl. createdAt) even though CurrentUser doesn't declare it
  const joinedAt = (user as CurrentUser & { createdAt?: string }).createdAt;
  // Shares the dashboard / cases cache key
  const cases = useQuery({ queryKey: ['cases', 'all'], queryFn: () => api.get<Paginated<CaseListItem>>('/cases?limit=50') });
  const activeCases = cases.data ? cases.data.items.filter((c) => c.status !== 'CLOSED').length : null;
  const [passwordOpen, setPasswordOpen] = useState(false);

  const profile = useForm<ProfileInput>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { lastName: user.lastName, firstName: user.firstName, phone: user.phone ?? '' },
  });
  const password = useForm<PasswordFormInput>({
    resolver: zodResolver(PasswordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function saveProfile(values: ProfileInput) {
    try {
      await api.patch('/users/me', { ...values, phone: values.phone || null });
      await refresh();
      profile.reset(values);
      toast.success(t('savedToast'));
    } catch (error) {
      toast.danger(t('saveFailed'), error instanceof ApiError ? error.message : undefined);
    }
  }

  async function changePassword({ currentPassword, newPassword }: PasswordFormInput) {
    try {
      await api.patch('/users/me/password', { currentPassword, newPassword });
      password.reset();
      toast.success(t('passwordChanged'), t('passwordChangedBody'));
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t('error');
      password.setError('currentPassword', { message });
      toast.danger(t('passwordFailed'), message);
    }
  }

  const userInitials = initials(user.firstName, user.lastName);

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      {/* Header (desktop) */}
      <div className="hidden flex-col gap-2 md:flex">
        <h2 className="text-h2">{t('title')}</h2>
        <p className="text-body text-text-secondary">{t('description')}</p>
      </div>

      {/* Profile strip (mobile) — 88px avatar, Mobile/H2 name, meta, change-photo action */}
      <div className="-mx-5 -mt-6 flex flex-col items-center gap-4 bg-bg-surface px-5 py-6 text-center md:hidden">
        <ProfileAvatar initials={userInitials} src={user.avatarUrl} className="size-[88px] text-[26px] leading-[34px]" />
        <p className="font-serif text-[26px] font-semibold leading-[34px] tracking-[-0.2px] text-text-primary">{shortName(user.firstName, user.lastName)}</p>
        <p className="text-body-sm text-text-secondary">
          {tRole(user.role)}{activeCases !== null && <> · {t('activeCases', { count: activeCases })}</>}
        </p>
        <div className="flex flex-col items-center gap-1">
          <Button variant="secondary" size="md" disabled title={t('soon')}>{t('changePhoto')}</Button>
          <span className="text-caption text-text-muted">{t('soon')}</span>
        </div>
      </div>

      <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-6">
        {/* Left column */}
        <div className="flex min-w-0 flex-1 flex-col gap-10 md:gap-6">
          {/* Personal info (33:827 / 37:1311) — card on desktop, plain section on mobile */}
          <section aria-labelledby="personal-title" className="flex flex-col gap-4 md:gap-5 md:rounded-lg md:border md:border-border-default md:bg-bg-surface md:p-6">
            <h3 id="personal-title" className="font-serif text-[20px] font-semibold leading-7 md:text-h4">{t('personal')}</h3>

            <div className="hidden items-center gap-5 md:flex">
              <ProfileAvatar initials={userInitials} src={user.avatarUrl} className="size-20 text-h3" />
              <div className="flex flex-col gap-2">
                <p className="text-body-sm-medium text-text-primary">{t('photo')}</p>
                <p className="text-caption text-text-muted">{t('photoHint', { soon: t('soon') })}</p>
                <div className="flex gap-2.5">
                  <Button variant="secondary" size="sm" disabled title={t('soon')}>{t('changePhoto')}</Button>
                  <Button variant="ghost" size="sm" disabled title={t('soon')}>{t('removePhoto')}</Button>
                </div>
              </div>
            </div>
            <div className="hidden h-px bg-border-default md:block" />

            <form onSubmit={profile.handleSubmit(saveProfile)} noValidate className="flex flex-col gap-4 md:gap-5">
              <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                <Input label={t('lastName')} autoComplete="family-name" required error={profile.formState.errors.lastName?.message} {...profile.register('lastName')} />
                <Input label={t('firstName')} autoComplete="given-name" required error={profile.formState.errors.firstName?.message} {...profile.register('firstName')} />
                <Input label={t('registryNumber')} placeholder={t('soon')} disabled readOnly helper={t('registryHelper')} wrapperClassName="hidden md:flex" />
                <Input label={t('phone')} placeholder="9911-2233" inputMode="tel" autoComplete="tel" helper={t('phoneHelper')} error={profile.formState.errors.phone?.message} {...profile.register('phone')} />
                <Input label={t('email')} value={user.email} disabled readOnly helper={t('emailHelper')} />
                <Input label={t('address')} placeholder={t('soon')} disabled readOnly />
                <Input label={t('workplace')} placeholder={t('soon')} disabled readOnly wrapperClassName="hidden md:flex" />
              </div>
              <div className="flex gap-3 pt-1 md:pt-0">
                <Button type="submit" size="lg" className="w-full md:hidden" disabled={profile.formState.isSubmitting}>{t('save')}</Button>
                <Button type="submit" size="md" className="hidden md:inline-flex" disabled={profile.formState.isSubmitting}>{t('save')}</Button>
                <Button type="button" variant="ghost" size="md" className="hidden md:inline-flex" disabled={!profile.formState.isDirty || profile.formState.isSubmitting} onClick={() => profile.reset()}>{t('cancel')}</Button>
              </div>
            </form>
          </section>

          {/* Password (33:877) — always on desktop; on mobile opened from the Security box */}
          <Card id="password-card" className={cn('order-2 flex-col gap-5 p-6 md:order-none md:flex', passwordOpen ? 'flex' : 'hidden')}>
            <h3 className="font-serif text-[20px] font-semibold leading-7 md:text-h4">{t('changePassword')}</h3>
            <form onSubmit={password.handleSubmit(changePassword)} noValidate className="flex flex-col gap-5">
              <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                <Input label={t('currentPassword')} type="password" autoComplete="current-password" required error={password.formState.errors.currentPassword?.message} {...password.register('currentPassword')} />
                <Input label={t('newPassword')} type="password" autoComplete="new-password" required helper={t('newPasswordHelper')} error={password.formState.errors.newPassword?.message} {...password.register('newPassword')} />
                <Input label={t('repeatPassword')} type="password" autoComplete="new-password" required error={password.formState.errors.confirmPassword?.message} {...password.register('confirmPassword')} />
              </div>
              <div><Button type="submit" size="md" className="w-full md:w-auto" disabled={password.formState.isSubmitting}>{t('updatePassword')}</Button></div>
            </form>
          </Card>

          {/* Notification settings (33:898 / 37:1335) — not supported by the API yet */}
          <section aria-labelledby="notif-settings-title" className="order-1 flex flex-col gap-4 md:order-none md:gap-[18px] md:rounded-lg md:border md:border-border-default md:bg-bg-surface md:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 id="notif-settings-title" className="font-serif text-[20px] font-semibold leading-7 md:text-h4">{t('notificationSettings')}</h3>
              <SoonTag />
            </div>
            <div className="flex flex-col gap-4 rounded-lg border border-border-default bg-bg-surface p-[18px] md:gap-[18px] md:border-0 md:bg-transparent md:p-0">
              {NOTIFICATION_SETTINGS.map((setting) => (
                <div key={setting.key} className="flex items-center gap-4 md:gap-5 md:py-1.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <p className="text-body-sm-medium text-text-primary md:text-body-medium">{t(`notifications.${setting.key}.label`)}</p>
                    <p className="hidden text-body-sm text-text-secondary md:block">{t(`notifications.${setting.key}.description`)}</p>
                  </div>
                  <Toggle label={t(`notifications.${setting.key}.label`)} soonLabel={t('soonLower')} checked={setting.on} />
                </div>
              ))}
              <div className="hidden h-px bg-border-default md:block" />
              <p className="hidden text-body-medium text-text-primary md:block">{t('channels')}</p>
              <div className="hidden flex-wrap gap-x-6 md:flex">
                <Checkbox label={t('channelEmail')} disabled className="w-[200px]" />
                <Checkbox label="SMS" disabled className="w-[200px]" />
                <Checkbox label={t('channelPortal')} checked disabled className="w-[200px]" />
              </div>
            </div>

            {/* Security box (mobile, 37:1358) */}
            <div className="flex flex-col gap-3.5 rounded-lg border border-border-default bg-bg-surface p-[18px] md:hidden">
              <p className="text-body-medium text-text-primary">{t('security')}</p>
              <TwoFactorRow />
              <Button variant="secondary" size="md" className="w-full" aria-expanded={passwordOpen} aria-controls="password-card" onClick={() => setPasswordOpen((v) => !v)}>{t('changePassword')}</Button>
              <Button variant="danger" size="md" className="w-full" onClick={() => void logout()}>{t('logout')}</Button>
            </div>
          </section>
        </div>

        {/* Right column (desktop, 344px) */}
        <aside className="hidden w-[344px] shrink-0 flex-col gap-5 md:flex">
          <Card className="flex flex-col gap-3.5 p-6">
            <p className="text-body-medium text-text-primary">{t('account')}</p>
            <dl className="flex flex-col gap-3.5">
              <InfoRow label={t('clientCode')} value={<span className="text-text-muted">{t('soon')}</span>} />
              <InfoRow label={t('joined')} value={formatDate(joinedAt, locale)} />
              <InfoRow label={t('lastLogin')} value={formatDateTime(user.lastLoginAt, locale)} />
              <InfoRow label={t('activeCasesLabel')} value={activeCases ?? '—'} />
            </dl>
          </Card>
          <Card className="flex flex-col gap-3.5 p-6">
            <p className="text-body-medium text-text-primary">{t('security')}</p>
            <TwoFactorRow />
            <div className="h-px bg-border-default" />
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-body-sm-medium text-text-primary">{t('devices')}</p>
              <SoonTag />
            </div>
            <p className="text-caption text-text-muted">{t('devicesHint')}</p>
            <Button variant="danger" size="md" className="w-full" disabled title={t('soon')}>{t('logoutAll')}</Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}

/** Figma profile avatar: navy disc, gold serif initials (gold-500 is allowed on the dark fill). */
function ProfileAvatar({ initials: text, src, className }: { initials: string; src: string | null; className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-inverse font-serif font-semibold tracking-[-0.2px] text-gold-500', className)} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="size-full object-cover" /> : text}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-body-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-right font-medium text-text-primary">{value}</dd>
    </div>
  );
}

function TwoFactorRow() {
  const t = useTranslations('portal.profile');
  return (
    <div className="flex items-center gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:gap-[3px]">
        <p className="text-body-sm-medium text-text-primary">{t('twoFactor')}</p>
        <p className="text-caption text-text-muted">{t('twoFactorHint', { soon: t('soon') })}</p>
      </div>
      <Toggle label={t('twoFactor')} soonLabel={t('soonLower')} checked={false} />
    </div>
  );
}

function SoonTag() {
  const t = useTranslations('portal.profile');
  return <span className="rounded-full bg-bg-surface-alt px-2.5 py-0.5 text-caption text-text-muted">{t('soon')}</span>;
}

/** Figma "Toggle" 48×28 (brand-primary on / border-strong off, 22px white knob). Read-only until the API stores preferences. */
function Toggle({ label, soonLabel, checked }: { label: string; soonLabel: string; checked: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${label} (${soonLabel})`}
      disabled
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 cursor-not-allowed items-center rounded-full opacity-60 focus-ring',
        checked ? 'bg-brand-primary' : 'bg-border-strong',
      )}
    >
      <span aria-hidden className={cn('absolute top-[3px] size-[22px] rounded-full bg-bg-surface', checked ? 'left-[23px]' : 'left-[3px]')} />
    </button>
  );
}
