'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';

/** UI only — the password-reset API is not available yet. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
    toast.info('Тун удахгүй', 'Нууц үг сэргээх үйлчилгээ удахгүй нэвтэрнэ. Одоогоор +976 7000-1199 дугаарт хандана уу.');
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Input label="И-мэйл" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.mn" />
      {sent && <p className="rounded-md bg-bg-accent-soft px-4 py-3 text-body-sm text-text-accent" role="status">Нууц үг сэргээх үйлчилгээ тун удахгүй. Түр зуур манай оффистой холбогдоно уу.</p>}
      <Button type="submit" size="md">Заавар илгээх</Button>
    </form>
  );
}
