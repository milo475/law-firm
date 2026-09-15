'use client';

import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { BankAccountSettingsCard, FirmSettingsCard } from '@/components/admin/settings-cards';
import { useUser } from '@/components/portal/user-context';
import { ErrorState } from '@/components/ui/states';

/** ADMIN-only firm settings: the invoice payment account and the firm details. */
export default function AdminSettingsPage() {
  const { user } = useUser();

  if (user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col gap-6">
        <AdminPageTitle title="Тохиргоо" />
        <ErrorState title="403 — Энэ хэсэг зөвхөн админд" message="Төлбөрийн данс, фирмийн мэдээллийг зөвхөн админ солино." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageTitle title="Тохиргоо" description="Фирмийн хэмжээний тохиргоо. Өөрчлөлт бүр аудитын бүртгэлд бичигдэнэ." />
      <BankAccountSettingsCard />
      <FirmSettingsCard />
    </div>
  );
}
