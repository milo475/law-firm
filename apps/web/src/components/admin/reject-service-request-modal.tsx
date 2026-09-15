'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { RejectServiceRequestSchema, type RejectServiceRequestInput } from '@law-firm/shared/schemas';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type ServiceRequestItem } from '@/lib/api';

/** Asks for the mandatory reason; the client sees it on «Миний хүсэлт» and in a notification. */
export function RejectServiceRequestModal({ request, open, onOpenChange, onRejected }: {
  request: ServiceRequestItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRejected: () => void | Promise<void>;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RejectServiceRequestInput>({
    resolver: zodResolver(RejectServiceRequestSchema),
    defaultValues: { rejectionReason: '' },
  });

  useEffect(() => {
    if (open) reset({ rejectionReason: '' });
  }, [open, reset]);

  const reject = useMutation({
    mutationFn: (values: RejectServiceRequestInput) => api.post<ServiceRequestItem>(`/service-requests/${request.id}/reject`, values),
    onSuccess: async () => {
      toast.success('Хүсэлтийг татгалзлаа', 'Шалтгааныг харилцагчид мэдэгдлээ.');
      onOpenChange(false);
      await onRejected();
    },
    onError: (error) => toast.danger('Татгалзаж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title="Хүсэлтийг татгалзах"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={reject.isPending}>Болих</Button>
            <Button variant="danger" size="md" type="submit" form="reject-service-request-form" disabled={reject.isPending}>
              {reject.isPending ? 'Түр хүлээнэ үү…' : 'Татгалзах'}
            </Button>
          </>
        }
      >
        <form id="reject-service-request-form" noValidate className="flex flex-col gap-4" onSubmit={handleSubmit((values) => reject.mutate(values))}>
          <p className="text-body-sm text-text-secondary">«{request.title}» хүсэлтийг татгалзана. Харилцагч шалтгааныг порталд харна.</p>
          <Textarea
            label="Татгалзах шалтгаан"
            required
            rows={4}
            placeholder="Жишээ: Энэ чиглэлээр манай фирм үйлчилгээ үзүүлдэггүй"
            error={errors.rejectionReason?.message}
            {...register('rejectionReason')}
          />
        </form>
      </ModalContent>
    </Modal>
  );
}
