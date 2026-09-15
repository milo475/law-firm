'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { formatPhone } from '@/lib/format';
import { useFirmSettings } from '@/lib/settings';

/** UI only — the password-reset API is not available yet. */
export function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const firm = useFirmSettings();
  const phone = firm.data ? formatPhone(firm.data.phone) : null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
    toast.info('Тун удахгүй', `Нууц үг сэргээх үйлчилгээ удахгүй нэвтэрнэ.${phone ? ` Одоогоор ${phone} дугаарт хандана уу.` : ''}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 md:gap-6">
      <Input
        label="Утас эсвэл имэйл"
        placeholder="batbayar@example.mn"
        autoComplete="username"
        required
        helper="Гэрээнд бүртгүүлсэн хаягаа оруулна уу"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />
      <Button type="submit" size="lg" className="w-full">
        Сэргээх холбоос илгээх
      </Button>
      {/* Figma "Info" 28:258 — status-new tint */}
      <div className="flex flex-col gap-2 rounded-md bg-status-new-bg px-5 py-4 text-body-sm" role="status">
        <p className="text-body-sm-medium text-status-new-fg">{sent ? 'Тун удахгүй' : 'Холбоос 30 минут хүчинтэй'}</p>
        <p className="text-text-secondary">
          {sent
            ? `Нууц үг сэргээх үйлчилгээ тун удахгүй нэвтэрнэ.${phone ? ` Түр зуур ${phone} дугаарт холбогдоно уу.` : ''}`
            : `Хэрэв имэйл ирээгүй бол спам хавтсаа шалгана уу.${phone ? ` Асуудал үргэлжилбэл ${phone} дугаарт холбогдоно уу.` : ''}`}
        </p>
      </div>
    </form>
  );
}
