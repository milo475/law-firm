// FAQ accordion — Radix Accordion styled with design-system tokens (used on /faq)
'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDownIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ className, ...props }: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn('rounded-lg border border-border-default bg-bg-surface', className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'focus-ring group flex min-h-14 w-full items-center justify-between gap-4 rounded-lg px-6 py-4 text-left text-body-medium text-text-primary transition-colors hover:bg-bg-brand-soft',
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

export function AccordionContent({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content className="overflow-hidden" {...props}>
      <div className={cn('px-6 pb-5 text-body text-text-secondary', className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
