'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'primary' | 'danger';
  /** Shows an optional note field; its value is passed to onConfirm. */
  noteLabel?: string;
  pending?: boolean;
  onConfirm: (note: string) => void;
}

/** Confirmation dialog built on the design-system Modal (used for close / delete actions). */
export function ConfirmModal({ open, onOpenChange, title, description, confirmLabel, variant = 'primary', noteLabel, pending, onConfirm }: ConfirmModalProps) {
  const [note, setNote] = useState('');
  return (
    <Modal open={open} onOpenChange={(next) => { if (!next) setNote(''); onOpenChange(next); }}>
      <ModalContent
        title={title}
        description={description}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={pending}>Болих</Button>
            <Button variant={variant} size="md" onClick={() => onConfirm(note)} disabled={pending}>{pending ? 'Түр хүлээнэ үү…' : confirmLabel}</Button>
          </>
        }
      >
        {noteLabel && <Textarea label={noteLabel} value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} helper="Заавал биш" />}
      </ModalContent>
    </Modal>
  );
}
