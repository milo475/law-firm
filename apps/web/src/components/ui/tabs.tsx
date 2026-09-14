// Figma: Design System / Tabs (10:64) + Tab item (10:63) — 48px, active: 2px brand underline
'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex w-full items-start overflow-x-auto border-b border-border-default', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        '-mb-px inline-flex h-12 shrink-0 items-center justify-center whitespace-nowrap border-b px-5 text-body text-text-secondary transition-colors focus-ring',
        'border-transparent hover:text-text-brand',
        'data-[state=active]:border-b-2 data-[state=active]:border-brand-primary data-[state=active]:text-body-medium data-[state=active]:text-text-brand',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('pt-6 focus-ring', className)} {...props} />;
}
