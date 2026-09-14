'use client';

import { useState, type FormEvent } from 'react';
import { useUser } from '@/components/portal/user-context';
import { ApiError, api } from '@/lib/api';
import { ROLE_LABELS, formatDate } from '@/lib/format';

const field = 'mt-1 w-full rounded-md border border-brand-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';

export default function ProfilePage() {
  const { user, refresh } = useUser();
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    try {
      await api.patch('/users/me', { ...data, phone: data.phone || null });
      await refresh();
      setProfileMsg({ ok: true, text: 'Профайл хадгалагдлаа.' });
    } catch (err) {
      setProfileMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Алдаа гарлаа' });
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await api.patch('/users/me/password', data);
      form.reset();
      setPasswordMsg({ ok: true, text: 'Нууц үг солигдлоо. Бусад төхөөрөмж дээрх сесс хаагдсан.' });
    } catch (err) {
      setPasswordMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Алдаа гарлаа' });
    }
  }

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl md:text-3xl">Профайл</h1>
        <p className="mt-1 text-sm text-slate-600">
          {ROLE_LABELS[user.role]} · {user.email} · сүүлд нэвтэрсэн {formatDate(user.lastLoginAt, true)}
        </p>
      </div>

      <form onSubmit={saveProfile} className="space-y-4 rounded-lg border border-brand-100 bg-white p-6">
        <h2 className="text-lg">Хувийн мэдээлэл</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-brand-900">
            Овог
            <input name="lastName" defaultValue={user.lastName} required minLength={2} className={field} />
          </label>
          <label className="block text-sm font-medium text-brand-900">
            Нэр
            <input name="firstName" defaultValue={user.firstName} required minLength={2} className={field} />
          </label>
        </div>
        <label className="block text-sm font-medium text-brand-900">
          Утас
          <input name="phone" defaultValue={user.phone ?? ''} pattern="(\+976)?[0-9]{8}" className={field} />
        </label>
        {profileMsg && <p className={`text-sm ${profileMsg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{profileMsg.text}</p>}
        <button type="submit" className="rounded-md bg-brand-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">Хадгалах</button>
      </form>

      <form onSubmit={changePassword} className="space-y-4 rounded-lg border border-brand-100 bg-white p-6">
        <h2 className="text-lg">Нууц үг солих</h2>
        <label className="block text-sm font-medium text-brand-900">
          Одоогийн нууц үг
          <input name="currentPassword" type="password" required autoComplete="current-password" className={field} />
        </label>
        <label className="block text-sm font-medium text-brand-900">
          Шинэ нууц үг
          <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className={field} />
        </label>
        {passwordMsg && <p className={`text-sm ${passwordMsg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{passwordMsg.text}</p>}
        <button type="submit" className="rounded-md bg-brand-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">Нууц үг солих</button>
      </form>
    </div>
  );
}
