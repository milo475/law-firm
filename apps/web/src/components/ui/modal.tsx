// Figma: Design System / Modal (14:50) — header + body + action footer, 60% overlay, 44px close
'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CloseIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export const Modal = DialogPrimitive.Root;

export interface ModalContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  title: string;
  description?: string;
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
}

export function ModalContent({ title, description, footer, size = 'md', className, children, ...props }: ModalContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(10,30,51,0.6)] data-[state=open]:animate-in data-[state=open]:fade-in" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-bg-surface shadow-modal focus:outline-none',
          size === 'md' ? 'max-w-[560px]' : 'max-w-[840px]',
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border-default py-[14px] pl-7 pr-5">
          <DialogPrimitive.Title className="text-h4">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close className="focus-ring -mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface-alt" aria-label="Хаах">
            <CloseIcon size={44} />
          </DialogPrimitive.Close>
        </div>
        <div className="flex flex-col gap-5 overflow-y-auto px-7 py-6">
          {description ? (
            <DialogPrimitive.Description className="text-body text-text-secondary">{description}</DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          )}
          {children}
        </div>
        {footer && <div className="flex items-center justify-end gap-3 bg-bg-surface-alt px-7 py-5">{footer}</div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
