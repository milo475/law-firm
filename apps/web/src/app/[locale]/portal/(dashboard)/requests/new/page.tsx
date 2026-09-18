// Client portal — new service request: a lawyer or a consultation, the area of law, a title and what happened.
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CreateServiceRequestSchema, type CreateServiceRequestInput } from '@law-firm/shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type ServiceRequestItem, type ServiceRequestType } from '@/lib/api';
import { CASE_TYPE_LABELS } from '@/lib/format';
import { SERVICE_REQUESTS_KEY } from '@/lib/service-requests';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const TYPES: ServiceRequestType[] = ['LAWYER', 'CONSULTATION'];

export default function NewServiceRequestPage() {
  return (
    <Suspense fallback={null}>
      <NewServiceRequestForm />
    </Suspense>
  );
}

function NewServiceRequestForm() {
  const t = useTranslations('portal.requests.new');
  const tPortal = useTranslations('portal');
  const tRequests = useTranslations('portal.requests');
  const tType = useTranslations('enums.serviceRequestType');
  const tCaseType = useTranslations('enums.caseType');
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  // The lawyer / consultation CTAs on the public contact page pass ?type=
  const initialType: ServiceRequestType = searchParams.get('type') === 'CONSULTATION' ? 'CONSULTATION' : 'LAWYER';

  const { register, control, handleSubmit, formState: { errors } } = useForm<CreateServiceRequestInput>({
    resolver: zodResolver(CreateServiceRequestSchema),
    defaultValues: { type: initialType, title: '', description: '' },
  });

  const create = useMutation({
    mutationFn: (values: CreateServiceRequestInput) => api.post<ServiceRequestItem>('/service-requests', values),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: SERVICE_REQUESTS_KEY });
      toast.success(t('createdTitle'), t('createdBody', { title: created.title }));
      router.push('/portal/requests');
    },
    onError: (error) => toast.danger(t('failed'), error instanceof ApiError ? error.message : t('tryAgain')),
  });

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Breadcrumb className="hidden md:block" items={[{ label: tPortal('breadcrumbRoot'), href: '/portal' }, { label: tRequests('title'), href: '/portal/requests' }, { label: t('title') }]} />
      <Card className="flex w-full max-w-[720px] flex-col gap-6 p-5 md:p-8">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-h3 md:text-h2">{t('title')}</h2>
          <p className="text-body-sm text-text-secondary md:text-body">{t('description')}</p>
        </div>

        <form noValidate onSubmit={handleSubmit((values) => create.mutate(values))} className="flex flex-col gap-5 md:gap-6">
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <span id="request-type-label" className="text-body-sm-medium text-text-primary">{t('typeLabel')}</span>
                <div role="radiogroup" aria-labelledby="request-type-label" className="grid gap-3 sm:grid-cols-2">
                  {TYPES.map((value) => {
                    const active = field.value === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => field.onChange(value)}
                        className={cn(
                          'focus-ring flex flex-col gap-1 rounded-lg p-4 text-left transition-colors',
                          active ? 'border-2 border-brand-primary bg-bg-brand-soft p-[15px]' : 'border border-border-default bg-bg-surface hover:bg-bg-brand-soft',
                        )}
                      >
                        <span className="text-body-medium text-text-primary">{tType(value)}</span>
                        <span className="text-body-sm text-text-secondary">{t(`typeHint.${value}`)}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.type?.message && <p className="text-body-sm text-status-danger-fg">{errors.type.message}</p>}
              </div>
            )}
          />
          <Controller
            control={control}
            name="caseType"
            render={({ field }) => (
              <Select
                label={t('caseTypeLabel')}
                required
                placeholder={t('caseTypePlaceholder')}
                options={Object.keys(CASE_TYPE_LABELS).map((value) => ({ value, label: tCaseType(value) }))}
                value={field.value || undefined}
                onValueChange={field.onChange}
                error={errors.caseType?.message}
              />
            )}
          />
          <Input label={t('titleLabel')} required placeholder={t('titlePlaceholder')} error={errors.title?.message} {...register('title')} />
          <Textarea
            label={t('descriptionLabel')}
            required
            rows={7}
            maxLength={5000}
            placeholder={t('descriptionPlaceholder')}
            helper={t('descriptionHelper')}
            error={errors.description?.message}
            {...register('description')}
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button asChild variant="ghost" size="lg"><Link href="/portal/requests">{t('cancel')}</Link></Button>
            <Button type="submit" size="lg" disabled={create.isPending}>{create.isPending ? t('submitting') : t('submit')}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
