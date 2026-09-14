// Figma: Design System / Button (5:74) — Type × State × Size = 36 variants
'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  // base: Label/Button typography, radius/md, ≥44px touch target, focus ring
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans font-semibold transition-colors focus-ring disabled:pointer-events-none select-none',
  {
    variants: {
      variant: {
        // Primary: brand-primary → hover brand-primary-hover; disabled state-disabled-bg + text-disabled
        primary:
          'bg-brand-primary text-text-on-inverse hover:bg-brand-primary-hover disabled:bg-state-disabled-bg disabled:text-text-disabled',
        // Secondary: surface + 1.5px border-brand; hover bg-brand-soft; disabled border-default
        secondary:
          'bg-bg-surface text-text-brand border-[1.5px] border-border-brand hover:bg-bg-brand-soft disabled:border-border-default disabled:text-text-disabled',
        // Ghost: transparent, text-brand; hover bg-brand-soft
        ghost: 'bg-transparent text-text-brand hover:bg-bg-brand-soft disabled:text-text-disabled',
        // Danger: status-danger-solid → hover status-danger-fg
        danger:
          'bg-status-danger-solid text-text-on-inverse hover:bg-status-danger-fg disabled:bg-state-disabled-bg disabled:text-text-disabled',
      },
      size: {
        sm: 'h-11 px-4 text-[14px] leading-5', // 44px — Label/Button sm
        md: 'h-12 px-6 text-[16px] leading-6', // 48px — Label/Button md
        lg: 'h-14 px-8 text-[18px] leading-[26px]', // 56px — Label/Button lg
        icon: 'size-11', // 44px square touch target
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. <Link>) while keeping button styles. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? 'button')}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
