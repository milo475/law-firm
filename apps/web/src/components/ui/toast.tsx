// Figma: Design System / Toast (14:49) — Type: Success / Warning / Danger / Info (rendered by sonner)
'use client';

import { Toaster as Sonner, toast as sonnerToast } from 'sonner';
import { CloseIcon, ToastDangerIcon, ToastInfoIcon, ToastSuccessIcon, ToastWarningIcon } from '@/components/icons';

type Kind = 'success' | 'warning' | 'danger' | 'info';

const ICONS: Record<Kind, React.ReactNode> = {
  success: <ToastSuccessIcon size={36} />,
  warning: <ToastWarningIcon size={36} />,
  danger: <ToastDangerIcon size={36} />,
  info: <ToastInfoIcon size={36} />,
};

function ToastCard({ id, kind, title, description }: { id: string | number; kind: Kind; title: string; description?: string }) {
  return (
    <div role="status" className="flex w-[min(440px,calc(100vw-32px))] items-start gap-3.5 rounded-md border border-border-default bg-bg-surface p-4 shadow-toast">
      <span className="shrink-0">{ICONS[kind]}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
        <p className="text-body-medium text-text-primary">{title}</p>
        {description && <p className="text-body-sm text-text-secondary">{description}</p>}
      </div>
      <button type="button" onClick={() => sonnerToast.dismiss(id)} aria-label="Хаах" className="focus-ring -mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-bg-surface-alt">
        <CloseIcon size={44} />
      </button>
    </div>
  );
}

function show(kind: Kind, title: string, description?: string) {
  return sonnerToast.custom((id) => <ToastCard id={id} kind={kind} title={title} description={description} />, { duration: kind === 'danger' ? 8000 : 5000 });
}

export const toast = {
  success: (title: string, description?: string) => show('success', title, description),
  warning: (title: string, description?: string) => show('warning', title, description),
  danger: (title: string, description?: string) => show('danger', title, description),
  info: (title: string, description?: string) => show('info', title, description),
  dismiss: sonnerToast.dismiss,
};

export function Toaster() {
  return <Sonner position="top-right" offset={16} gap={12} visibleToasts={4} />;
}
