// Publishing a testimonial and adding / editing one by hand. Admin copy stays Mongolian.
'use client';

import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type AdminTestimonial } from '@/lib/api';
import { CASE_TYPE_LABELS } from '@/lib/format';

const NONE = 'NONE';
const RATINGS = ['1', '2', '3', '4', '5'];

/**
 * The consent gate. Publishing is only possible once a staff member confirms — in writing — that the
 * client agreed to have their name shown, and says how that permission was obtained. The API enforces
 * the same rule, so this dialog is the reminder, not the lock.
 */
export function PublishTestimonialModal({
  testimonial,
  open,
  onOpenChange,
  onPublished,
}: {
  testimonial: AdminTestimonial | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && testimonial) {
      setConfirmed(testimonial.consentGiven);
      setNote(testimonial.consentNote ?? '');
      setError(null);
    }
  }, [open, testimonial]);

  const publish = useMutation({
    mutationFn: () =>
      api.patch<AdminTestimonial>(`/admin/testimonials/${testimonial?.id}`, {
        status: 'PUBLISHED',
        consentGiven: true,
        consentNote: note.trim(),
      }),
    onSuccess: () => {
      toast.success('Нийтлэгдлээ', 'Сэтгэгдэл сайтад харагдана.');
      onPublished();
    },
    onError: (apiError) => {
      const message = apiError instanceof ApiError ? apiError.message : 'Дахин оролдоно уу.';
      setError(message);
      toast.danger('Нийтэлж чадсангүй', message);
    },
  });

  const submit = () => {
    if (!confirmed) {
      setError('Зөвшөөрлийг баталгаажуулна уу');
      return;
    }
    if (note.trim().length < 3) {
      setError('Зөвшөөрлийг хэрхэн авсныг бичнэ үү');
      return;
    }
    publish.mutate();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {testimonial && (
        <ModalContent
          title="Сэтгэгдлийг нийтлэх"
          description={`«${testimonial.authorName}» нэрээр сайтад харагдана. Нэрийг зөвшөөрөлгүй нийтлэхгүй.`}
          footer={
            <>
              <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={publish.isPending}>Болих</Button>
              <Button size="md" onClick={submit} disabled={publish.isPending}>{publish.isPending ? 'Нийтэлж байна…' : 'Нийтлэх'}</Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <blockquote className="whitespace-pre-line rounded-md bg-bg-page px-4 py-3 text-body-sm text-text-secondary">
              {testimonial.body}
            </blockquote>
            <Checkbox
              label="Харилцагчаас нэрээ нийтлэх зөвшөөрлийг авсан гэдгийг баталж байна"
              checked={confirmed}
              onCheckedChange={(value) => {
                setConfirmed(value === true);
                setError(null);
              }}
            />
            {confirmed && (
              <Textarea
                label="Зөвшөөрлийг хэрхэн авсан бэ?"
                required
                rows={3}
                placeholder="Жишээ: порталаас баталсан · 2026-09-20-нд и-мэйлээр · утсаар зөвшөөрөл өгсөн"
                helper="Дараа шалгах шаардлага гарвал энэ тэмдэглэл нотолгоо болно."
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  setError(null);
                }}
              />
            )}
            {testimonial.source === 'PORTAL' && (
              <p className="text-caption text-text-muted">
                Энэ сэтгэгдлийг харилцагч порталаас өөрөө бичиж, тэнд зөвшөөрлөө баталсан.
              </p>
            )}
            {error && <p role="alert" className="text-body-sm text-status-danger-fg">{error}</p>}
          </div>
        </ModalContent>
      )}
    </Modal>
  );
}

/** Add a testimonial that arrived by e-mail, Facebook or word of mouth — or edit any row. */
export function TestimonialFormModal({
  testimonial,
  open,
  onOpenChange,
  onSaved,
}: {
  testimonial: AdminTestimonial | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const editing = testimonial !== null;
  const [values, setValues] = useState({
    authorName: '',
    authorTitle: '',
    body: '',
    rating: NONE,
    caseType: NONE,
    consentGiven: false,
    consentNote: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setValues({
      authorName: testimonial?.authorName ?? '',
      authorTitle: testimonial?.authorTitle ?? '',
      body: testimonial?.body ?? '',
      rating: testimonial?.rating ? String(testimonial.rating) : NONE,
      caseType: testimonial?.caseType ?? NONE,
      consentGiven: testimonial?.consentGiven ?? false,
      consentNote: testimonial?.consentNote ?? '',
    });
  }, [open, testimonial]);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        authorName: values.authorName.trim(),
        authorTitle: values.authorTitle.trim() || (editing ? null : undefined),
        body: values.body.trim(),
        rating: values.rating === NONE ? (editing ? null : undefined) : Number(values.rating),
        caseType: values.caseType === NONE ? (editing ? null : undefined) : values.caseType,
        consentGiven: values.consentGiven,
        consentNote: values.consentNote.trim() || (editing ? null : undefined),
      };
      return editing
        ? api.patch<AdminTestimonial>(`/admin/testimonials/${testimonial.id}`, payload)
        : api.post<AdminTestimonial>('/admin/testimonials', payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Хадгаллаа' : 'Нэмэгдлээ', editing ? undefined : 'Хянагдаагүй төлөвтэй хадгалагдлаа.');
      onSaved();
    },
    onError: (apiError) => {
      const message = apiError instanceof ApiError ? apiError.message : 'Дахин оролдоно уу.';
      setError(message);
      toast.danger('Хадгалж чадсангүй', message);
    },
  });

  const submit = () => {
    if (values.authorName.trim().length < 2) return setError('Зохиогчийн нэрийг бичнэ үү');
    if (values.body.trim().length < 30) return setError('Сэтгэгдэл хамгийн багадаа 30 тэмдэгт байна');
    if (values.consentGiven && values.consentNote.trim().length < 3) return setError('Зөвшөөрлийг хэрхэн авсныг бичнэ үү');
    return save.mutate();
  };

  const set = (key: keyof typeof values) => (value: string | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size="lg"
        title={editing ? 'Сэтгэгдэл засах' : 'Сэтгэгдэл гараар нэмэх'}
        description={
          editing
            ? 'Бичвэр, нэр, чиглэл, зөвшөөрлийн тэмдэглэлийг засна.'
            : 'Facebook, и-мэйл, амаар ирсэн сэтгэгдлийг оруулна. Хянагдаагүй төлөвтэй хадгалагдана.'
        }
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={save.isPending}>Болих</Button>
            <Button size="md" onClick={submit} disabled={save.isPending}>{save.isPending ? 'Хадгалж байна…' : 'Хадгалах'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Нэр" required value={values.authorName} onChange={(event) => set('authorName')(event.target.value)} />
            <Input label="Албан тушаал" placeholder="ХХК-ийн захирал" value={values.authorTitle} onChange={(event) => set('authorTitle')(event.target.value)} />
          </div>
          <Textarea
            label="Сэтгэгдэл"
            required
            rows={6}
            maxLength={1000}
            helper="30–1000 тэмдэгт"
            value={values.body}
            onChange={(event) => set('body')(event.target.value)}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Үнэлгээ"
              value={values.rating}
              onValueChange={set('rating')}
              options={[{ value: NONE, label: 'Үнэлгээгүй' }, ...RATINGS.map((value) => ({ value, label: `${value} од` }))]}
            />
            <Select
              label="Чиглэл"
              value={values.caseType}
              onValueChange={set('caseType')}
              options={[{ value: NONE, label: 'Чиглэлгүй' }, ...Object.entries(CASE_TYPE_LABELS).map(([value, label]) => ({ value, label }))]}
            />
          </div>
          <Checkbox
            label="Харилцагчаас нэрээ нийтлэх зөвшөөрлийг авсан"
            checked={values.consentGiven}
            onCheckedChange={(value) => set('consentGiven')(value === true)}
          />
          {values.consentGiven && (
            <Textarea
              label="Зөвшөөрлийн тэмдэглэл"
              required
              rows={2}
              placeholder="Жишээ: 2026-09-20-нд и-мэйлээр зөвшөөрөл өгсөн"
              value={values.consentNote}
              onChange={(event) => set('consentNote')(event.target.value)}
            />
          )}
          {error && <p role="alert" className="text-body-sm text-status-danger-fg">{error}</p>}
        </div>
      </ModalContent>
    </Modal>
  );
}
