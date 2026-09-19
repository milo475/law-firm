// Figma: Design System / Checkbox (7:43) — Checked × State(Default/Disabled); 44px row, 24px box
'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { forwardRef, useId } from 'react';
import { CheckIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'children'> {
  label?: React.ReactNode;
}

export const Checkbox = forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ label, className, disabled, id: idProp, ...props }, ref) => {
    const generated = useId();
    const id = idProp ?? generated;
    return (
      <div className={cn('flex h-11 items-center gap-3', className)}>
        <CheckboxPrimitive.Root
          ref={ref}
          id={id}
          disabled={disabled}
          className={cn(
            // `after` widens the tap target to the 44px row without changing how the box looks.
            'peer relative flex size-6 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-border-strong bg-bg-surface transition-colors focus-ring',
            'after:absolute after:-inset-2.5 after:content-[""]',
            'data-[state=checked]:border-brand-primary data-[state=checked]:bg-brand-primary',
            'disabled:bg-bg-surface-alt disabled:cursor-not-allowed disabled:data-[state=checked]:border-state-disabled-bg disabled:data-[state=checked]:bg-state-disabled-bg',
          )}
          {...props}
        >
          <CheckboxPrimitive.Indicator className={cn('text-text-on-inverse', disabled && 'text-text-disabled')}>
            <CheckIcon size={12} />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        {label && (
          <label htmlFor={id} className={cn('text-body cursor-pointer', disabled ? 'text-text-disabled cursor-not-allowed' : 'text-text-primary')}>
            {label}
          </label>
        )}
      </div>
    );
  },
);
Checkbox.displayName = 'Checkbox';
