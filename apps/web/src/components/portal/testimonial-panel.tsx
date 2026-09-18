// The client's own testimonial about a closed case: write one, see where it stands, take it back.
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTestimonialSchema, TESTIMONIAL_BODY_MAX } from '@law-firm/shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { StarIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type MyTestimonial } from '@/lib/api';
import { MY_TESTIMONIALS_KEY, useMyTestimonials } from '@/lib/testimonials';
import { cn } from '@/lib/utils';

const FormSchema = CreateTestimonialSchema.omit({ caseId: true });
/** `rating` is coerced, so the form holds the raw input shape and the handler gets the parsed one. */
type FormInput = z.input<typeof FormSchema>;
type FormValues = z.output<typeof FormSchema>;

const STATUS_TONE = { PENDING: 'pending', PUBLISHED: 'progress', REJECTED: 'closed' } as const;

/** 1–5 stars; clicking the active one clears the rating again. */
function RatingInput({ value, onChange }: { value: number | undefined; onChange: (value: number | undefined) => void }) {
  const t = useTranslations('portal.testimonial');
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={t('ratingLabel')}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-pressed={value === star}
          aria-label={t('ratingValue', { rating: star })}
          onClick={() => onChange(value === star ? undefined : star)}
          className="focus-ring -m-1 rounded-sm p-1"
        >
          <StarIcon className={cn('size-6', value && star <= value ? 'text-accent-default' : 'text-border-strong')} />
        </button>
      ))}
    </div>
  );
}

function StatusCard({ testimonial }: { testimonial: MyTestimonial }) {
  const t = useTranslations('portal.testimonial');
  const queryClient = useQueryClient();
  const revoke = useMutation({
    mutationFn: () => api.post<MyTestimonial>(`/testimonials/${testimonial.id}/revoke-consent`, {}),
    onSuccess: async () => {
      toast.success(t('revokedTitle'), t('revokedBody'));
      await queryClient.invalidateQueries({ queryKey: MY_TESTIMONIALS_KEY });
    },
    onError: (error) => toast.danger(t('revokeFailed'), error instanceof ApiError ? error.message : t('tryAgain')),
  });

  const hint =
    testimonial.status === 'PUBLISHED'
      ? t('statusPublishedHint')
      : testimonial.status === 'REJECTED'
        ? t('statusRejectedHint')
        : t('statusPendingHint');

  return (
    <Card data-testid="my-testimonial" className="flex flex-col gap-3.5 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-h4 text-text-primary">{t('myTitle')}</h3>
        <Badge tone={STATUS_TONE[testimonial.status]}>{t(`status.${testimonial.status}`)}</Badge>
      </div>
      {testimonial.rating !== null && (
        <p className="flex items-center gap-1" aria-label={t('ratingValue', { rating: testimonial.rating })}>
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon key={star} aria-hidden className={cn('size-4', star <= (testimonial.rating ?? 0) ? 'text-accent-default' : 'text-border-default')} />
          ))}
        </p>
      )}
      <p className="whitespace-pre-line text-body-sm text-text-secondary">{testimonial.body}</p>
      <p className="text-caption text-text-muted">{testimonial.consentGiven ? hint : t('consentRevoked')}</p>
      {testimonial.consentGiven && (
        <div>
          <Button variant="secondary" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate()}>
            {revoke.isPending ? t('revoking') : t('revoke')}
          </Button>
        </div>
      )}
    </Card>
  );
}

export function TestimonialPanel({ caseId }: { caseId: string }) {
  const t = useTranslations('portal.testimonial');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const mine = useMyTestimonials();
  const existing = mine.data?.find((item) => item.case?.id === caseId);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { body: '' },
  });
  const rating = watch('rating') as number | undefined;
  const consentGiven = watch('consentGiven');

  const create = useMutation({
    mutationFn: (values: FormValues) => api.post<MyTestimonial>('/testimonials', { ...values, caseId }),
    onSuccess: async () => {
      toast.success(t('sentTitle'), t('sentBody'));
      reset({ body: '' });
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: MY_TESTIMONIALS_KEY });
    },
    onError: (error) => toast.danger(t('failed'), error instanceof ApiError ? error.message : t('tryAgain')),
  });

  if (mine.isLoading) return null;
  if (existing) return <StatusCard testimonial={existing} />;

  if (!open) {
    return (
      <Card className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between md:gap-6 md:p-6">
        <p className="text-body-sm text-text-secondary">{t('ctaHint')}</p>
        <Button size="md" className="w-full shrink-0 md:w-auto" onClick={() => setOpen(true)}>{t('cta')}</Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-5 md:gap-5 md:p-6">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-h4 text-text-primary">{t('title')}</h3>
        <p className="text-body-sm text-text-secondary">{t('description')}</p>
      </div>
      <form noValidate onSubmit={handleSubmit((values) => create.mutate(values))} className="flex flex-col gap-4 md:gap-5">
        <Textarea
          label={t('bodyLabel')}
          required
          rows={6}
          maxLength={TESTIMONIAL_BODY_MAX}
          placeholder={t('bodyPlaceholder')}
          helper={t('bodyHelper')}
          error={errors.body?.message}
          {...register('body')}
        />
        <div className="flex flex-col gap-2">
          <span className="text-body-sm-medium text-text-primary">{t('ratingLabel')}</span>
          <RatingInput value={rating} onChange={(value) => setValue('rating', value, { shouldValidate: true })} />
        </div>
        <div className="flex flex-col gap-1">
          <Checkbox
            label={t('consent')}
            checked={consentGiven === true}
            onCheckedChange={(value) => setValue('consentGiven', value === true ? true : (undefined as unknown as true), { shouldValidate: true })}
          />
          <p className={cn('text-caption', errors.consentGiven ? 'text-status-danger-fg' : 'text-text-muted')}>
            {errors.consentGiven?.message ?? t('consentHelper')}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="md" onClick={() => setOpen(false)}>{t('cancel')}</Button>
          <Button type="submit" size="md" disabled={isSubmitting || create.isPending}>
            {create.isPending ? t('submitting') : t('submit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
