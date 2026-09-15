'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { RejectDocumentRequestSchema } from '@law-firm/shared/schemas';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type DocumentRequestItem } from '@/lib/api';

const RejectFormSchema = RejectDocumentRequestSchema.pick({ rejectionReason: true });
type RejectFormValues = z.infer<typeof RejectFormSchema>;

/** Asks for the mandatory rejection reason; the client sees it in the portal and in a notification. */
export function RejectRequestModal({ request, onOpenChange, onRejected }: {
  request: DocumentRequestItem | null;
  onOpenChange: (open: boolean) => void;
  onRejected: () => void;
}) {
  const form = useForm<RejectFormValues>({ resolver: zodResolver(RejectFormSchema), defaultValues: { rejectionReason: '' } });

  useEffect(() => {
    if (request) form.reset({ rejectionReason: '' });
  }, [request, form]);

  const reject = useMutation({
    mutationFn: ({ id, rejectionReason }: { id: string; rejectionReason: string }) =>
      api.post<DocumentRequestItem>(`/document-requests/${id}/review`, { decision: 'REJECTED', rejectionReason }),
    onSuccess: (updated) => {
      toast.success('Баримт буцаагдлаа', `«${updated.title}» — шалтгааныг харилцагчид мэдэгдлээ.`);
      onRejected();
      onOpenChange(false);
    },
    onError: (error) => toast.danger('Буцааж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <Modal open={Boolean(request)} onOpenChange={onOpenChange}>
      <ModalContent
        title="Баримт буцаах"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={reject.isPending}>Болих</Button>
            <Button variant="danger" size="md" type="submit" form="reject-request-form" disabled={reject.isPending}>
              {reject.isPending ? 'Түр хүлээнэ үү…' : 'Буцаах'}
            </Button>
          </>
        }
      >
        <form
          id="reject-request-form"
          noValidate
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((values) => request && reject.mutate({ id: request.id, rejectionReason: values.rejectionReason }))}
        >
          <p className="text-body-sm text-text-secondary">
            «{request?.title}» баримтыг буцаана. Харилцагч шалтгааныг порталд харж, файлаа дахин илгээнэ.
          </p>
          <Textarea
            label="Буцаах шалтгаан"
            required
            rows={4}
            placeholder="Жишээ: Зураг бүдэг байна, тод хуулбарыг дахин илгээнэ үү"
            error={errors.rejectionReason?.message}
            {...register('rejectionReason')}
          />
        </form>
      </ModalContent>
    </Modal>
  );
}
