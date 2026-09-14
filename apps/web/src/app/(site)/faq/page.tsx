import type { Metadata } from 'next';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { FAQ } from '@/content/faq';

export const metadata: Metadata = { title: 'Түгээмэл асуулт', description: 'Үйлчилгээ, төлбөр, портал, нууцлалын талаарх түгээмэл асуулт, хариулт.' };

export default function FaqPage() {
  return (
    <>
      <PageHeader overline="Тусламж" title="Түгээмэл асуулт, хариулт" description="Хариулт олдоогүй бол бидэнтэй шууд холбогдоно уу." crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Түгээмэл асуулт' }]} />
      <section className="mx-auto max-w-[840px] px-4 py-16 md:px-6 md:py-24">
        <Accordion type="single" collapsible defaultValue={FAQ[0]?.id} className="flex flex-col gap-3">
          {FAQ.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-12 flex flex-col items-start gap-3 rounded-lg bg-bg-accent-soft p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-h4">Өөр асуулт байна уу?</p>
            <p className="mt-1 text-body-sm text-text-secondary">Ажлын өдрүүдэд 1 өдрийн дотор хариулна.</p>
          </div>
          <Button asChild size="md"><Link href="/contact">Асуулт илгээх</Link></Button>
        </div>
      </section>
    </>
  );
}
