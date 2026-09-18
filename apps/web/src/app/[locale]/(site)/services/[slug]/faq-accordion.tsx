// Figma: 06 Service Detail — flush "Accordion" (20:570 / 25:1460): divider rows, no card chrome.
// The shared ui/accordion renders bordered cards, so this local variant is used here (see report).
'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDownIcon } from '@/components/icons';

export interface ServiceFaqItem {
  id: string;
  question: string;
  answer: string;
}

export function ServiceFaqAccordion({ items }: { items: ServiceFaqItem[] }) {
  return (
    <AccordionPrimitive.Root type="single" collapsible defaultValue={items[0]?.id} className="flex w-full max-w-[694px] flex-col">
      {items.map((item) => (
        <AccordionPrimitive.Item key={item.id} value={item.id} className="border-b border-border-default">
          <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger className="focus-ring group flex min-h-14 w-full items-center justify-between gap-4 rounded-sm py-4.5 text-left md:py-5">
              <span className="text-body-medium text-text-primary group-data-[state=open]:text-text-brand md:text-body-lg">{item.question}</span>
              <ChevronDownIcon size={14} className="shrink-0 text-text-brand transition-transform group-data-[state=open]:rotate-180" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden">
            <p className="max-w-[680px] pb-5 text-body-sm text-text-secondary md:pb-6 md:text-body">{item.answer}</p>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
