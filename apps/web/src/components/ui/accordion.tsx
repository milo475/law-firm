// FAQ accordion — Radix Accordion styled with design-system tokens (used on /faq)
'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDownIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ className, variant = 'card', ...props }: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> & { variant?: 'card' | 'flush' }) {
  return (
    <AccordionPrimitive.Item
      className={cn(variant === 'card' ? 'rounded-lg border border-border-default bg-bg-surface' : 'border-b border-border-default', className)}
      {...props}
    />
  );
}

export function AccordionTrigger({ className, variant = 'card', children, ...props }: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & { variant?: 'card' | 'flush' }) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'focus-ring group flex min-h-14 w-full items-center justify-between gap-4 text-left transition-colors',
          variant === 'card'
            ? 'rounded-lg px-6 py-4 text-body-medium text-text-primary hover:bg-bg-brand-soft'
            : 'px-0 py-[22px] text-body-lg text-text-primary data-[state=open]:text-text-brand',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon size={12} className="shrink-0 text-text-secondary transition-transform group-data-[state=open]:rotate-180" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({ className, variant = 'card', children, ...props }: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> & { variant?: 'card' | 'flush' }) {
  return (
    <AccordionPrimitive.Content className="overflow-hidden" {...props}>
      <div className={cn('text-body text-text-secondary', variant === 'card' ? 'px-6 pb-5' : 'max-w-[660px] px-0 pb-[22px]', className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
