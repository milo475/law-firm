'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type DragEvent, useRef, useState } from 'react';
import { ConfirmModal } from '@/components/admin/confirm-modal';
import { UploadCircleIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileChip } from '@/components/ui/file-chip';
import { Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';
import { REQUEST_FILE_ACCEPT, validateRequestFiles } from '@/lib/document-requests';
import { formatBytes, formatDate } from '@/lib/format';
import { taskAttachmentsKey, type TaskAttachmentItem } from '@/lib/tasks';
import { cn, shortName } from '@/lib/utils';

/** Files on a task: anyone who can open the task uploads and downloads; the uploader or an admin deletes. */
export function TaskAttachmentsCard({ taskId, viewer }: { taskId: string; viewer: { id: string; role: string } }) {
  const queryClient = useQueryClient();
  const key = taskAttachmentsKey(taskId);
  const attachments = useQuery({ queryKey: key, queryFn: () => api.get<TaskAttachmentItem[]>(`/tasks/${taskId}/attachments`) });
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [toDelete, setToDelete] = useState<TaskAttachmentItem | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post<TaskAttachmentItem>(`/tasks/${taskId}/attachments`, form);
    },
    onSuccess: async (item) => {
      toast.success('Файл хавсаргалаа', item.name);
      await refresh();
    },
    onError: (error) => toast.danger('Файл хавсаргаж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });
  const remove = useMutation({
    mutationFn: (item: TaskAttachmentItem) => api.delete(`/task-attachments/${item.id}`),
    onSuccess: async () => {
      toast.success('Файл устгагдлаа');
      setToDelete(null);
      await refresh();
    },
    onError: (error) => toast.danger('Устгаж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  function handleFiles(list: FileList | File[]) {
    const { accepted, errors } = validateRequestFiles(Array.from(list));
    for (const message of errors) toast.danger('Файл тохирохгүй', message);
    for (const file of accepted) upload.mutate(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) handleFiles(event.dataTransfer.files);
  }

  async function download(item: TaskAttachmentItem) {
    try {
      const { url } = await api.get<{ url: string }>(`/task-attachments/${item.id}/download`);
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      toast.danger('Татаж чадсангүй', error instanceof ApiError ? error.message : undefined);
    }
  }

  const items = attachments.data ?? [];

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h3 className="text-h4">Хавсралт{items.length ? ` (${items.length})` : ''}</h3>
      <input
        ref={fileInput}
        type="file"
        multiple
        accept={REQUEST_FILE_ACCEPT}
        className="sr-only"
        aria-label="Даалгаварт хавсаргах файл сонгох"
        onChange={(event) => {
          if (event.target.files?.length) handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <div
        role="button"
        tabIndex={0}
        aria-label="Файлаа энд чирж оруулна уу, эсвэл товшиж сонгоно уу"
        onClick={() => fileInput.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            fileInput.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'focus-ring flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-[1.5px] border-dashed px-4 py-5 text-center transition-colors',
          dragging ? 'border-border-focus bg-bg-accent-soft' : 'border-border-brand bg-bg-brand-soft hover:bg-navy-100',
        )}
      >
        <UploadCircleIcon className="size-9 text-text-brand" />
        <p className="text-body-sm-medium text-text-brand">
          {upload.isPending ? 'Хуулж байна…' : (
            <>
              <span className="md:hidden">Файл сонгох</span>
              <span className="hidden md:inline">Файлаа энд чирж оруулна уу, эсвэл товшиж сонгоно уу</span>
            </>
          )}
        </p>
        <p className="text-caption text-text-secondary">PDF, DOCX, XLSX, JPG, PNG, TXT · 20MB хүртэл</p>
      </div>

      {attachments.isLoading ? (
        <Skeleton className="h-14" />
      ) : attachments.isError ? (
        <p role="alert" className="text-body-sm text-status-danger-fg">Хавсралт ачаалж чадсангүй.</p>
      ) : items.length === 0 ? (
        <p className="text-body-sm text-text-muted">Хавсаргасан файл алга.</p>
      ) : (
        <ul aria-label="Хавсралтууд" className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <FileChip
                name={item.name}
                mimeType={item.mimeType}
                meta={`${formatBytes(item.size)} · ${formatDate(item.createdAt, 'mn', true)} · ${shortName(item.uploadedBy.firstName, item.uploadedBy.lastName)}`}
                action={
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => void download(item)} aria-label={`Татах: ${item.name}`}>Татах</Button>
                    {(viewer.role === 'ADMIN' || item.uploadedBy.id === viewer.id) && (
                      <Button variant="ghost" size="sm" onClick={() => setToDelete(item)} aria-label={`Устгах: ${item.name}`}>Устгах</Button>
                    )}
                  </div>
                }
              />
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Хавсралт устгах"
        description={toDelete ? `«${toDelete.name}» файлыг бүр мөсөн устгах уу?` : ''}
        confirmLabel="Устгах"
        variant="danger"
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete)}
      />
    </Card>
  );
}
