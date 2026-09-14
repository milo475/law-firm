// Figma: Design System / Input, Textarea, Select share this label + helper/error wrapper
import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface FieldProps {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Receives the generated ids so the control can be labelled/described. */
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
}

export function Field({ label, helper, error, required, disabled, className, children }: FieldProps) {
  const id = useId();
  const helperId = `${id}-helper`;
  const message = error ?? helper;
  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      {label && (
        <label
          htmlFor={id}
          className={cn('text-label-field', disabled ? 'text-text-disabled' : 'text-text-primary')}
        >
          {label}
          {required && <span className="ml-0.5 text-status-danger-fg" aria-hidden>*</span>}
        </label>
      )}
      {children({ id, describedBy: message ? helperId : undefined, invalid: Boolean(error) })}
      {message && (
        <p
          id={helperId}
          role={error ? 'alert' : undefined}
          className={cn('text-body-sm', error ? 'text-status-danger-fg' : disabled ? 'text-text-disabled' : 'text-text-muted')}
        >
          {message}
        </p>
      )}
    </div>
  );
}

/** Shared control chrome — Default / Focus / Filled / Error / Disabled */
export const controlClass = cn(
  'w-full rounded-md border bg-bg-surface px-4 text-body text-text-primary placeholder:text-text-muted',
  'border-border-default outline-none transition-[border-color,box-shadow]',
  'focus:border-2 focus:border-border-focus focus:shadow-focus-ring focus:px-[15px]',
  'disabled:bg-bg-surface-alt disabled:text-text-disabled disabled:placeholder:text-text-disabled disabled:cursor-not-allowed',
  'aria-[invalid=true]:border-[1.5px] aria-[invalid=true]:border-status-danger-solid aria-[invalid=true]:px-[15.5px]',
);
