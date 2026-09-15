// Figma: 02 Client Portal / Portal / 10 Profile / Desktop (33:806) + Mobile (37:1292)
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChangePasswordSchema, PhoneSchema, type ChangePasswordInput } from '@law-firm/shared/schemas';
import { useQuery } from '@tanstack/react-query';
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
import { ROLE_LABELS, formatDate } from '@/lib/format';
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

// Figma "Мэдэгдлийн тохиргоо" — the API has no preference storage yet, so these render disabled ("Тун удахгүй").
const NOTIFICATION_SETTINGS = [
  { label: 'Хэргийн явцын шинэчлэл', description: 'Хэрэгт шинэ тэмдэглэл, шийдвэр нэмэгдэх бүрд мэдэгдэнэ.', on: true },
  { label: 'Шинэ баримт', description: 'Хуульч баримт хавсаргахад мэдэгдэнэ.', on: true },
  { label: 'Нэхэмжлэх ба төлбөр', description: 'Шинэ нэхэмжлэх үүсэх, эцсийн хугацаа дөхөхөд сануулна.', on: true },
  { label: 'Мессеж', description: 'Хуульчаас мессеж ирэхэд мэдэгдэнэ.', on: true },
  { label: 'Маркетингийн мэдээлэл', description: 'Шинэ нийтлэл, сургалтын урилга илгээнэ.', on: false },
];

const formatDateTime = (iso: string | null | undefined) => (iso ? formatDate(iso, true).replace(' ', ', ') : '—');

export default function ProfilePage() {
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
      toast.success('Профайл хадгалагдлаа');
    } catch (error) {
      toast.danger('Хадгалж чадсангүй', error instanceof ApiError ? error.message : undefined);
    }
  }

  async function changePassword({ currentPassword, newPassword }: PasswordFormInput) {
    try {
      await api.patch('/users/me/password', { currentPassword, newPassword });
      password.reset();
      toast.success('Нууц үг солигдлоо', 'Бусад төхөөрөмж дээрх сесс хаагдсан.');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Алдаа гарлаа';
      password.setError('currentPassword', { message });
      toast.danger('Нууц үг солигдсонгүй', message);
    }
  }

  const userInitials = initials(user.firstName, user.lastName);

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      {/* Header (desktop) */}
      <div className="hidden flex-col gap-2 md:flex">
        <h2 className="text-h2">Профайл ба тохиргоо</h2>
        <p className="text-body text-text-secondary">Хувийн мэдээлэл, нэвтрэх нууц үг, мэдэгдлийн сонголтоо эндээс удирдана.</p>
      </div>

      {/* Profile strip (mobile) — 88px avatar, Mobile/H2 name, meta, "Зураг солих" */}
      <div className="-mx-5 -mt-6 flex flex-col items-center gap-4 bg-bg-surface px-5 py-6 text-center md:hidden">
        <ProfileAvatar initials={userInitials} src={user.avatarUrl} className="size-[88px] text-[26px] leading-[34px]" />
        <p className="font-serif text-[26px] font-semibold leading-[34px] tracking-[-0.2px] text-text-primary">{shortName(user.firstName, user.lastName)}</p>
        <p className="text-body-sm text-text-secondary">
          {ROLE_LABELS[user.role]}{activeCases !== null && <> · {activeCases} идэвхтэй хэрэг</>}
        </p>
        <div className="flex flex-col items-center gap-1">
          <Button variant="secondary" size="md" disabled title="Тун удахгүй">Зураг солих</Button>
          <span className="text-caption text-text-muted">Тун удахгүй</span>
        </div>
      </div>

      <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-6">
        {/* Left column */}
        <div className="flex min-w-0 flex-1 flex-col gap-10 md:gap-6">
          {/* Personal info (33:827 / 37:1311) — card on desktop, plain section on mobile */}
          <section aria-labelledby="personal-title" className="flex flex-col gap-4 md:gap-5 md:rounded-lg md:border md:border-border-default md:bg-bg-surface md:p-6">
            <h3 id="personal-title" className="font-serif text-[20px] font-semibold leading-7 md:text-h4">Хувийн мэдээлэл</h3>

            <div className="hidden items-center gap-5 md:flex">
              <ProfileAvatar initials={userInitials} src={user.avatarUrl} className="size-20 text-h3" />
              <div className="flex flex-col gap-2">
                <p className="text-body-sm-medium text-text-primary">Профайл зураг</p>
                <p className="text-caption text-text-muted">JPG эсвэл PNG · 2MB хүртэл · Тун удахгүй</p>
                <div className="flex gap-2.5">
                  <Button variant="secondary" size="sm" disabled title="Тун удахгүй">Зураг солих</Button>
                  <Button variant="ghost" size="sm" disabled title="Тун удахгүй">Устгах</Button>
                </div>
              </div>
            </div>
            <div className="hidden h-px bg-border-default md:block" />

            <form onSubmit={profile.handleSubmit(saveProfile)} noValidate className="flex flex-col gap-4 md:gap-5">
              <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                <Input label="Овог" autoComplete="family-name" required error={profile.formState.errors.lastName?.message} {...profile.register('lastName')} />
                <Input label="Нэр" autoComplete="given-name" required error={profile.formState.errors.firstName?.message} {...profile.register('firstName')} />
                <Input label="Регистрийн дугаар" placeholder="Тун удахгүй" disabled readOnly helper="Өөрчлөх бол хуульчдаа хандана уу" wrapperClassName="hidden md:flex" />
                <Input label="Утасны дугаар" placeholder="9911-2233" inputMode="tel" autoComplete="tel" helper="8 оронтой дугаар" error={profile.formState.errors.phone?.message} {...profile.register('phone')} />
                <Input label="Имэйл хаяг" value={user.email} disabled readOnly helper="Өөрчлөх бол админтай холбогдоно уу" />
                <Input label="Хаяг" placeholder="Тун удахгүй" disabled readOnly />
                <Input label="Ажлын газар" placeholder="Тун удахгүй" disabled readOnly wrapperClassName="hidden md:flex" />
              </div>
              <div className="flex gap-3 pt-1 md:pt-0">
                <Button type="submit" size="lg" className="w-full md:hidden" disabled={profile.formState.isSubmitting}>Хадгалах</Button>
                <Button type="submit" size="md" className="hidden md:inline-flex" disabled={profile.formState.isSubmitting}>Хадгалах</Button>
                <Button type="button" variant="ghost" size="md" className="hidden md:inline-flex" disabled={!profile.formState.isDirty || profile.formState.isSubmitting} onClick={() => profile.reset()}>Цуцлах</Button>
              </div>
            </form>
          </section>

          {/* Password (33:877) — always on desktop; on mobile opened from the Security box */}
          <Card id="password-card" className={cn('order-2 flex-col gap-5 p-6 md:order-none md:flex', passwordOpen ? 'flex' : 'hidden')}>
            <h3 className="font-serif text-[20px] font-semibold leading-7 md:text-h4">Нууц үг солих</h3>
            <form onSubmit={password.handleSubmit(changePassword)} noValidate className="flex flex-col gap-5">
              <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                <Input label="Одоогийн нууц үг" type="password" autoComplete="current-password" required error={password.formState.errors.currentPassword?.message} {...password.register('currentPassword')} />
                <Input label="Шинэ нууц үг" type="password" autoComplete="new-password" required helper="8-аас дээш тэмдэгт, үсэг ба тоо агуулсан" error={password.formState.errors.newPassword?.message} {...password.register('newPassword')} />
                <Input label="Шинэ нууц үг давтах" type="password" autoComplete="new-password" required error={password.formState.errors.confirmPassword?.message} {...password.register('confirmPassword')} />
              </div>
              <div><Button type="submit" size="md" className="w-full md:w-auto" disabled={password.formState.isSubmitting}>Нууц үг шинэчлэх</Button></div>
            </form>
          </Card>

          {/* Notification settings (33:898 / 37:1335) — not supported by the API yet */}
          <section aria-labelledby="notif-settings-title" className="order-1 flex flex-col gap-4 md:order-none md:gap-[18px] md:rounded-lg md:border md:border-border-default md:bg-bg-surface md:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 id="notif-settings-title" className="font-serif text-[20px] font-semibold leading-7 md:text-h4">Мэдэгдлийн тохиргоо</h3>
              <SoonTag />
            </div>
            <div className="flex flex-col gap-4 rounded-lg border border-border-default bg-bg-surface p-[18px] md:gap-[18px] md:border-0 md:bg-transparent md:p-0">
              {NOTIFICATION_SETTINGS.map((s) => (
                <div key={s.label} className="flex items-center gap-4 md:gap-5 md:py-1.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <p className="text-body-sm-medium text-text-primary md:text-body-medium">{s.label}</p>
                    <p className="hidden text-body-sm text-text-secondary md:block">{s.description}</p>
                  </div>
                  <Toggle label={s.label} checked={s.on} />
                </div>
              ))}
              <div className="hidden h-px bg-border-default md:block" />
              <p className="hidden text-body-medium text-text-primary md:block">Хүргэх суваг</p>
              <div className="hidden flex-wrap gap-x-6 md:flex">
                <Checkbox label="Имэйл" disabled className="w-[200px]" />
                <Checkbox label="SMS" disabled className="w-[200px]" />
                <Checkbox label="Порталын мэдэгдэл" checked disabled className="w-[200px]" />
              </div>
            </div>

            {/* Security box (mobile, 37:1358) */}
            <div className="flex flex-col gap-3.5 rounded-lg border border-border-default bg-bg-surface p-[18px] md:hidden">
              <p className="text-body-medium text-text-primary">Аюулгүй байдал</p>
              <TwoFactorRow />
              <Button variant="secondary" size="md" className="w-full" aria-expanded={passwordOpen} aria-controls="password-card" onClick={() => setPasswordOpen((v) => !v)}>Нууц үг солих</Button>
              <Button variant="danger" size="md" className="w-full" onClick={() => void logout()}>Гарах</Button>
            </div>
          </section>
        </div>

        {/* Right column (desktop, 344px) */}
        <aside className="hidden w-[344px] shrink-0 flex-col gap-5 md:flex">
          <Card className="flex flex-col gap-3.5 p-6">
            <p className="text-body-medium text-text-primary">Бүртгэлийн мэдээлэл</p>
            <dl className="flex flex-col gap-3.5">
              <InfoRow label="Харилцагчийн код" value={<span className="text-text-muted">Тун удахгүй</span>} />
              <InfoRow label="Бүртгүүлсэн" value={formatDate(joinedAt)} />
              <InfoRow label="Сүүлд нэвтэрсэн" value={formatDateTime(user.lastLoginAt)} />
              <InfoRow label="Идэвхтэй хэрэг" value={activeCases ?? '—'} />
            </dl>
          </Card>
          <Card className="flex flex-col gap-3.5 p-6">
            <p className="text-body-medium text-text-primary">Аюулгүй байдал</p>
            <TwoFactorRow />
            <div className="h-px bg-border-default" />
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-body-sm-medium text-text-primary">Идэвхтэй төхөөрөмж</p>
              <SoonTag />
            </div>
            <p className="text-caption text-text-muted">Нэвтэрсэн төхөөрөмжүүдийн жагсаалт удахгүй нэмэгдэнэ. Нууц үг солиход бусад төхөөрөмжийн сесс хаагдана.</p>
            <Button variant="danger" size="md" className="w-full" disabled title="Тун удахгүй">Бүх төхөөрөмжөөс гарах</Button>
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
  return (
    <div className="flex items-center gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:gap-[3px]">
        <p className="text-body-sm-medium text-text-primary">Хоёр шатлалт баталгаажуулалт</p>
        <p className="text-caption text-text-muted">Нэвтрэх бүрд SMS-ээр код илгээнэ. · Тун удахгүй</p>
      </div>
      <Toggle label="Хоёр шатлалт баталгаажуулалт" checked={false} />
    </div>
  );
}

function SoonTag() {
  return <span className="rounded-full bg-bg-surface-alt px-2.5 py-0.5 text-caption text-text-muted">Тун удахгүй</span>;
}

/** Figma "Toggle" 48×28 (brand-primary on / border-strong off, 22px white knob). Read-only until the API stores preferences. */
function Toggle({ label, checked }: { label: string; checked: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${label} (тун удахгүй)`}
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
