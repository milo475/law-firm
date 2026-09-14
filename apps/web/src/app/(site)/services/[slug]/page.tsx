import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { SERVICES, findService } from '@/content/services';

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const service = findService(slug);
  if (!service) return { title: 'Үйлчилгээ олдсонгүй' };
  return { title: service.title, description: service.short };
}

export default async function ServiceDetailPage({ params }: Params) {
  const { slug } = await params;
  const service = findService(slug);
  if (!service) notFound();
  const others = SERVICES.filter((s) => s.slug !== slug);

  return (
    <>
      <PageHeader overline="Үйлчилгээ" title={service.title} description={service.short} crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Үйлчилгээ', href: '/services' }, { label: service.title }]} />
      <section className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-10">
          <p className="text-body-lg text-text-secondary">{service.intro}</p>
          <div>
            <h2 className="text-h3">Бид юу хийдэг вэ</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {service.items.map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-md border border-border-default bg-bg-surface px-4 py-3 text-body text-text-primary">
                  <span aria-hidden className="mt-2.5 size-2 shrink-0 rounded-full bg-accent-default" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-h3">Ажлын явц</h2>
            <ol className="mt-5 grid gap-4 md:grid-cols-3">
              {service.process.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-6">
                  <span className="text-overline text-text-accent">Алхам {i + 1}</span>
                  <h3 className="text-h4">{step.title}</h3>
                  <p className="text-body-sm text-text-secondary">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <aside className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-lg bg-bg-inverse p-6 text-text-on-inverse">
            <h2 className="text-h4 text-text-on-inverse">Зөвлөгөө авах</h2>
            <p className="text-body-sm text-text-on-inverse-muted">Эхний 30 минутын танилцах уулзалт үнэ төлбөргүй.</p>
            <Button asChild size="md" className="bg-accent-default text-text-on-accent hover:bg-accent-hover"><Link href="/contact">Цаг товлох</Link></Button>
          </div>
          <div className="rounded-lg border border-border-default bg-bg-surface p-6">
            <h2 className="text-body-medium text-text-primary">Бусад чиглэл</h2>
            <ul className="mt-3 flex flex-col">
              {others.map((s) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`} className="focus-ring flex h-11 items-center rounded-sm text-body-sm text-text-secondary hover:text-text-brand">{s.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </>
  );
}
