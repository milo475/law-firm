// Figma: Design System / Input (6:27) — State: Default / Focus / Filled / Error / Disabled
'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { controlClass, Field } from './field';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helper, error, wrapperClassName, className, disabled, required, ...props }, ref) => (
    <Field label={label} helper={helper} error={error} disabled={disabled} required={required} className={wrapperClassName}>
      {({ id, describedBy, invalid }) => (
        <input
          ref={ref}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          required={required}
          className={cn(controlClass, 'h-12', className)}
          {...props}
        />
      )}
    </Field>
  ),
);
Input.displayName = 'Input';
