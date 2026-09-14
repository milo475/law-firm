// Figma: Design System / Textarea (6:43) — State: Default / Focus / Error
'use client';

import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { controlClass, Field } from './field';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helper?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helper, error, wrapperClassName, className, disabled, required, ...props }, ref) => (
    <Field label={label} helper={helper} error={error} disabled={disabled} required={required} className={wrapperClassName}>
      {({ id, describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          required={required}
          className={cn(controlClass, 'min-h-32 resize-y py-[14px] focus:py-[13px]', className)}
          {...props}
        />
      )}
    </Field>
  ),
);
Textarea.displayName = 'Textarea';
