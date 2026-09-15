'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BankAccountSettingsSchema, type BankAccountSettingsInput } from '@law-firm/shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';
import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { useUser } from '@/components/portal/user-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CardSkeleton, ErrorState } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type BankAccountSettings } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { BANK_ACCOUNT_KEY, formatAccountNumber, useBankAccount } from '@/lib/invoices';

type BankAccountValues = z.output<typeof BankAccountSettingsSchema>;

const formValues = (account: BankAccountSettings): BankAccountSettingsInput => ({
  bankName: account.bankName,
  accountNumber: account.accountNumber,
  accountName: account.accountName,
});

/** ADMIN-only firm settings: the account clients transfer invoice payments to. */
export default function AdminSettingsPage() {
  const { user } = useUser();
  const isAdmin = user.role === 'ADMIN';
  const queryClient = useQueryClient();
  const bank = useBankAccount(isAdmin);

  const { register, handleSubmit, reset, control, formState: { errors, isDirty } } = useForm<BankAccountSettingsInput, unknown, BankAccountValues>({
    resolver: zodResolver(BankAccountSettingsSchema),
    defaultValues: { bankName: '', accountNumber: '', accountName: '' },
  });
  const preview = useWatch({ control });

  useEffect(() => {
    if (bank.data) reset(formValues(bank.data));
  }, [bank.data, reset]);

  const save = useMutation({
    mutationFn: (values: BankAccountValues) => api.put<BankAccountSettings>('/settings/bank-account', values),
    onSuccess: (saved) => {
      queryClient.setQueryData(BANK_ACCOUNT_KEY, saved);
      reset(formValues(saved));
      toast.success('Данс хадгалагдлаа', 'Харилцагчийн төлбөрийн зааварт шинэ данс харагдана.');
    },
    onError: (error) => toast.danger('Хадгалж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <AdminPageTitle title="Тохиргоо" />
        <ErrorState title="403 — Энэ хэсэг зөвхөн админд" message="Төлбөр хүлээн авах дансыг зөвхөн админ солино." />
      </div>
    );
  }

  const account = bank.data;
  const isExample = account?.updatedAt === null;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageTitle title="Тохиргоо" description="Фирмийн хэмжээний тохиргоо. Өөрчлөлт бүр аудитын бүртгэлд бичигдэнэ." />

      {bank.isError ? (
        <ErrorState message={bank.error instanceof ApiError ? bank.error.message : 'Дансны мэдээлэл ачаалж чадсангүй'} onRetry={() => void bank.refetch()} />
      ) : !account ? (
        <CardSkeleton />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <Card className="flex flex-col gap-5 p-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-h4">Төлбөр хүлээн авах данс</h3>
              <p className="text-body-sm text-text-secondary">
                Харилцагч нэхэмжлэхийн төлбөрийг энэ дансанд шилжүүлнэ. Хадгалмагц илгээсэн, төлөгдөөгүй бүх нэхэмжлэхийн төлбөрийн зааварт шинэ данс харагдана.
              </p>
            </div>
            {isExample && (
              <div role="status" className="flex flex-col gap-1 rounded-md border-l-[3px] border-status-pending-fg bg-status-pending-bg px-4 py-3">
                <p className="text-body-sm-medium text-status-pending-fg">Одоогоор ЖИШЭЭ данс харагдаж байна</p>
                <p className="text-body-sm text-text-secondary">Бодит дансаа оруулж хадгалах хүртэл харилцагчид энэ жишээ дансыг харна.</p>
              </div>
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
              <Input label="Хүлээн авагч" required placeholder="Тулгуур Хуулийн Фирм ХХН" error={errors.accountName?.message} {...register('accountName')} />
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-caption text-text-muted">{account.updatedAt ? `Сүүлд хадгалсан: ${formatDate(account.updatedAt, true)}` : 'Бодит данс хадгалаагүй'}</p>
                <div className="flex gap-3">
                  <Button type="button" variant="ghost" size="md" disabled={!isDirty || save.isPending} onClick={() => reset(formValues(account))}>Буцаах</Button>
                  <Button type="submit" size="md" disabled={(!isDirty && !isExample) || save.isPending}>{save.isPending ? 'Хадгалж байна…' : 'Хадгалах'}</Button>
                </div>
              </div>
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
        </div>
      )}
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
