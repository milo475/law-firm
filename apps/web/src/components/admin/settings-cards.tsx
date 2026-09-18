'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  BankAccountSettingsSchema,
  FirmSettingsSchema,
  type BankAccountSettingsInput,
  type FirmSettingsInput,
} from '@law-firm/shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CardSkeleton, ErrorState } from '@/components/ui/states';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type BankAccountSettings, type FirmSettings } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { BANK_ACCOUNT_KEY, formatAccountNumber, useBankAccount } from '@/lib/invoices';
import { FIRM_SETTINGS_KEY, revalidatePublicFirmSettings, useFirmSettings } from '@/lib/settings';

type BankAccountValues = z.output<typeof BankAccountSettingsSchema>;
type FirmValues = z.output<typeof FirmSettingsSchema>;

const bankFormValues = (account: BankAccountSettings): BankAccountSettingsInput => ({
  bankName: account.bankName,
  accountNumber: account.accountNumber,
  accountName: account.accountName,
});

const firmFormValues = (firm: FirmSettings): FirmSettingsInput => ({
  name: firm.name,
  registrationNumber: firm.registrationNumber ?? '',
  phone: firm.phone,
  email: firm.email,
  address: firm.address,
  workingHours: firm.workingHours,
});

/** Pending-tone note while the built-in example values are still served. */
function ExampleNotice({ title, message }: { title: string; message: string }) {
  return (
    <div role="status" className="flex flex-col gap-1 rounded-md border-l-[3px] border-status-pending-fg bg-status-pending-bg px-4 py-3">
      <p className="text-body-sm-medium text-status-pending-fg">{title}</p>
      <p className="text-body-sm text-text-secondary">{message}</p>
    </div>
  );
}

/** Last-saved caption with Буцаах / Хадгалах; saving stays enabled while the example values are shown. */
function SaveRow({ updatedAt, dirty, pending, onReset }: { updatedAt: string | null; dirty: boolean; pending: boolean; onReset: () => void }) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-caption text-text-muted">{updatedAt ? `Сүүлд хадгалсан: ${formatDate(updatedAt, true)}` : 'Бодит мэдээлэл хадгалаагүй'}</p>
      <div className="flex gap-3">
        <Button type="button" variant="ghost" size="md" disabled={!dirty || pending} onClick={onReset}>Буцаах</Button>
        <Button type="submit" size="md" disabled={(!dirty && updatedAt !== null) || pending}>{pending ? 'Хадгалж байна…' : 'Хадгалах'}</Button>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-body-sm text-text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right text-body-sm-medium text-text-primary">{value}</dd>
    </div>
  );
}

/** The account clients transfer invoice payments to, with a preview of the portal payment instructions. */
export function BankAccountSettingsCard() {
  const queryClient = useQueryClient();
  const bank = useBankAccount();

  const { register, handleSubmit, reset, control, formState: { errors, isDirty } } = useForm<BankAccountSettingsInput, unknown, BankAccountValues>({
    resolver: zodResolver(BankAccountSettingsSchema),
    defaultValues: { bankName: '', accountNumber: '', accountName: '' },
  });
  const preview = useWatch({ control });

  useEffect(() => {
    if (bank.data) reset(bankFormValues(bank.data));
  }, [bank.data, reset]);

  const save = useMutation({
    mutationFn: (values: BankAccountValues) => api.put<BankAccountSettings>('/settings/bank-account', values),
    onSuccess: (saved) => {
      queryClient.setQueryData(BANK_ACCOUNT_KEY, saved);
      reset(bankFormValues(saved));
      toast.success('Данс хадгалагдлаа', 'Харилцагчийн төлбөрийн зааварт шинэ данс харагдана.');
    },
    onError: (error) => toast.danger('Хадгалж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  if (bank.isError) {
    return <ErrorState message={bank.error instanceof ApiError ? bank.error.message : 'Дансны мэдээлэл ачаалж чадсангүй'} onRetry={() => void bank.refetch()} />;
  }
  const account = bank.data;
  if (!account) return <CardSkeleton />;

  return (
    <section aria-labelledby="bank-account-title" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <Card className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-1">
          <h3 id="bank-account-title" className="text-h4">Төлбөр хүлээн авах данс</h3>
          <p className="text-body-sm text-text-secondary">
            Харилцагч нэхэмжлэхийн төлбөрийг энэ дансанд шилжүүлнэ. Хадгалмагц илгээсэн, төлөгдөөгүй бүх нэхэмжлэхийн төлбөрийн зааварт шинэ данс харагдана.
          </p>
        </div>
        {account.updatedAt === null && (
          <ExampleNotice title="Одоогоор ЖИШЭЭ данс харагдаж байна" message="Бодит дансаа оруулж хадгалах хүртэл харилцагчид энэ жишээ дансыг харна." />
        )}
        <form noValidate onSubmit={handleSubmit((values) => save.mutate(values))} className="flex flex-col gap-5">
          <Input label="Банк" required placeholder="Хаан банк" error={errors.bankName?.message} {...register('bankName')} />
          <Input
            label="Дансны дугаар"
            required
            autoComplete="off"
            placeholder="5023118822 эсвэл MN12 0005 …"
            helper="Зайтай бичсэн ч зайг автоматаар арилгана"
            error={errors.accountNumber?.message}
            {...register('accountNumber')}
          />
          <Input label="Хүлээн авагч" required placeholder="«Strategy Law Firm» ХХН" error={errors.accountName?.message} {...register('accountName')} />
          <SaveRow updatedAt={account.updatedAt} dirty={isDirty} pending={save.isPending} onReset={() => reset(bankFormValues(account))} />
        </form>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h3 className="text-h4">Харилцагчид ингэж харагдана</h3>
        <dl aria-label="Төлбөрийн зааврын харагдац" className="flex flex-col gap-2.5 rounded-md bg-bg-page px-5 py-4">
          <PreviewRow label="Банк" value={preview.bankName?.trim() || '—'} />
          <PreviewRow label="Дансны дугаар" value={preview.accountNumber?.trim() ? formatAccountNumber(preview.accountNumber) : '—'} />
          <PreviewRow label="Хүлээн авагч" value={preview.accountName?.trim() || '—'} />
        </dl>
        <p className="text-caption text-text-muted">Порталын «Төлбөрийн заавар» цонхонд төлөх дүн, гүйлгээний утга (нэхэмжлэхийн дугаар)-тай хамт гарна.</p>
      </Card>
    </section>
  );
}

/** Firm name, registration number and contacts used by the public site, the sign-in pages and invoices. */
export function FirmSettingsCard() {
  const queryClient = useQueryClient();
  const firm = useFirmSettings();

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FirmSettingsInput, unknown, FirmValues>({
    resolver: zodResolver(FirmSettingsSchema),
    defaultValues: { name: '', registrationNumber: '', phone: '', email: '', address: '', workingHours: '' },
  });

  useEffect(() => {
    if (firm.data) reset(firmFormValues(firm.data));
  }, [firm.data, reset]);

  const save = useMutation({
    mutationFn: (values: FirmValues) => api.put<FirmSettings>('/settings/firm', values),
    onSuccess: async (saved) => {
      queryClient.setQueryData(FIRM_SETTINGS_KEY, saved);
      reset(firmFormValues(saved));
      const refreshed = await revalidatePublicFirmSettings();
      toast.success(
        'Фирмийн мэдээлэл хадгалагдлаа',
        refreshed ? 'Нийтийн сайт, нэвтрэх хуудас, нэхэмжлэх дээр шинэ мэдээлэл харагдана.' : 'Нийтийн сайтад 1 минутын дотор шинэчлэгдэнэ.',
      );
    },
    onError: (error) => toast.danger('Хадгалж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  if (firm.isError) {
    return <ErrorState message={firm.error instanceof ApiError ? firm.error.message : 'Фирмийн мэдээлэл ачаалж чадсангүй'} onRetry={() => void firm.refetch()} />;
  }
  const details = firm.data;
  if (!details) return <CardSkeleton />;

  return (
    <section aria-labelledby="firm-settings-title">
      <Card className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-1">
          <h3 id="firm-settings-title" className="text-h4">Фирмийн мэдээлэл</h3>
          <p className="text-body-sm text-text-secondary">
            Нийтийн сайтын хөл, «Холбоо барих» хуудас, портал нэвтрэх хуудас болон нэхэмжлэхийн «Нэхэмжлэгч» хэсэгт харагдана.
          </p>
        </div>
        {details.updatedAt === null && (
          <ExampleNotice title="Одоогоор ЖИШЭЭ мэдээлэл харагдаж байна" message="Регистрийн дугаар хоосон байна. Бодит мэдээллээ оруулж хадгална уу." />
        )}
        <form noValidate onSubmit={handleSubmit((values) => save.mutate(values))} className="flex flex-col gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Input label="Фирмийн нэр" required wrapperClassName="md:col-span-2" placeholder="«Strategy Law Firm» ХХК" error={errors.name?.message} {...register('name')} />
            <Input label="Регистрийн дугаар" required inputMode="numeric" autoComplete="off" placeholder="5190028" helper="7 оронтой тоо" error={errors.registrationNumber?.message} {...register('registrationNumber')} />
            <Input label="Утас" required type="tel" inputMode="tel" placeholder="7000 1199" helper="8 оронтой; +976-г сайт дээр автоматаар нэмнэ" error={errors.phone?.message} {...register('phone')} />
            <Input label="И-мэйл" required type="email" placeholder="info@lawfirm.mn" error={errors.email?.message} {...register('email')} />
            <Input label="Ажлын цаг" required placeholder="Даваа–Баасан 09:00–18:00" error={errors.workingHours?.message} {...register('workingHours')} />
            <Textarea label="Хаяг" required rows={2} wrapperClassName="md:col-span-2" placeholder="Улаанбаатар хот, Сүхбаатар дүүрэг, …" error={errors.address?.message} {...register('address')} />
          </div>
          <SaveRow updatedAt={details.updatedAt} dirty={isDirty} pending={save.isPending} onReset={() => reset(firmFormValues(details))} />
        </form>
      </Card>
    </section>
  );
}
