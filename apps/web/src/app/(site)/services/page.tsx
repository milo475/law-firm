// Figma: 01 Public Site / Public / 05 Services / Desktop (19:526) + Mobile (25:1254)
import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { ENGAGEMENT_PROCESS, SERVICES, type ServiceDefinition } from '@/content/services';

export const metadata: Metadata = {
  title: 'Үйлчилгээ',
  description: 'Зургаан үндсэн чиглэлээр зөвлөгөө, баримт бичиг боловсруулах, шүүхэд төлөөлөх үйлчилгээг үзүүлнэ.',
};

/**
 * Figma "Service" card (19:563): gold accent bar, H3 title, one-line summary, three dot bullets and a text link.
 * Differs from the shared ServiceCard (icon + H4 + "Дэлгэрэнгүй"), so it lives here — see the report for the requested variant.
 */
function ServiceListCard({ service }: { service: ServiceDefinition }) {
  return (
    <Card className="flex flex-col items-start gap-3.5 px-5 py-6 md:gap-4 md:p-8">
      <span aria-hidden className="h-1 w-8 rounded-full bg-accent-default md:w-10" />
      <h2 className="text-h4 md:text-h3">{service.title}</h2>
      <p className="text-body text-text-secondary">{service.short}</p>
      <ul className="flex w-full flex-col gap-2.5">
        {service.highlights.map((item) => (
          <li key={item} className="flex items-start gap-2.5 md:gap-3">
            <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent-default" />
            <span className="text-body text-text-secondary">{item}</span>
          </li>
        ))}
      </ul>
      <Link href={`/services/${service.slug}`} className="focus-ring inline-flex h-11 items-center rounded-sm text-body-medium text-text-accent hover:underline md:mt-2">
        Дэлгэрэнгүй үзэх
        <span className="sr-only"> — {service.title}</span>
      </Link>
    </Card>
  );
}

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        title="Үйлчилгээний чиглэл"
        description="Зургаан үндсэн чиглэлээр зөвлөгөө, баримт бичиг боловсруулах, шүүхэд төлөөлөх үйлчилгээг үзүүлнэ."
        crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Үйлчилгээ', href: '/services' }, { label: 'Бүх чиглэл' }]}
      />

      {/* Services grid — 2 columns × 32px gap on desktop, stacked with 20px gap on mobile */}
      <section aria-labelledby="services-heading" className="bg-bg-surface">
        <h2 id="services-heading" className="sr-only">Үйлчилгээний чиглэлүүд</h2>
        <div className="mx-auto grid max-w-[1200px] gap-5 px-5 py-14 md:grid-cols-2 md:gap-8 md:px-6 md:py-24">
          {SERVICES.map((s) => <ServiceListCard key={s.slug} service={s} />)}
        </div>
      </section>

      {/* Process band — "Хамтран ажиллах явц / Дөрвөн алхмаар" */}
      <section aria-labelledby="process-heading" className="bg-bg-inverse">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-7 px-5 py-14 md:gap-12 md:px-6 md:py-24">
          <div className="flex flex-col gap-3 md:gap-4">
            <p className="text-overline text-accent-default">Хамтран ажиллах явц</p>
            <h2 id="process-heading" className="text-h3 text-text-on-inverse md:text-h2">Дөрвөн алхмаар</h2>
          </div>
          <ol className="grid gap-7 md:grid-cols-4 md:gap-8">
            {ENGAGEMENT_PROCESS.map((step, i) => (
              <li key={step.title} className="flex gap-3.5 md:flex-col md:gap-2.5">
                <span aria-hidden className="text-h4 text-accent-default md:text-h3">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1 md:gap-2.5">
                  <h3 className="text-body-medium text-text-on-inverse">
                    <span className="sr-only">Алхам {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="text-body-sm text-text-on-inverse-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
