// Figma: 01 Public Site / Public / 06 Service Detail / Desktop (20:500) + Mobile (25:1417)
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRightIcon } from '@/components/icons';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SERVICES, findService, type ServiceDefinition } from '@/content/services';
import { apiFetch, type LawyerProfile } from '@/lib/api';
import { initials, shortName } from '@/lib/utils';
import { ServiceFaqAccordion } from './faq-accordion';

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

/** Lawyers whose specialisations mention this service; falls back to the first profiles. */
async function lawyersFor(service: ServiceDefinition): Promise<LawyerProfile[]> {
  try {
    const all = await apiFetch<LawyerProfile[]>('/lawyers', { next: { revalidate: 60 } });
    const matched = all.filter((l) => l.specializations.some((s) => s.toLowerCase().includes(service.title.toLowerCase())));
    return (matched.length ? matched : all).slice(0, 3);
  } catch {
    return [];
  }
}

/** Breadcrumb on the navy hero — the shared Breadcrumb is fixed to light-surface colours (see report). */
function InverseBreadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Замын заалт">
      <ol className="flex flex-wrap items-center gap-2.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-2.5">
              {item.href && !last ? (
                <Link href={item.href} className="focus-ring rounded-sm text-body-sm text-text-on-inverse-muted hover:text-text-on-inverse">{item.label}</Link>
              ) : (
                <span className="text-body-sm-medium text-text-on-inverse" aria-current={last ? 'page' : undefined}>{item.label}</span>
              )}
              {!last && <ChevronRightIcon size={5} className="text-text-on-inverse-muted" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function DotList({ items }: { items: string[] }) {
  return (
    <ul className="flex w-full flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 md:gap-3">
          <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent-default" />
          <span className="text-body text-text-secondary">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function ServiceDetailPage({ params }: Params) {
  const { slug } = await params;
  const service = findService(slug);
  if (!service) notFound();
  const lawyers = await lawyersFor(service);

  return (
    <>
      {/* Hero (20:526 / 25:1428) — navy band */}
      <section className="bg-bg-inverse">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-5 py-10 md:gap-5 md:px-6 md:py-16">
          <InverseBreadcrumb items={[{ label: 'Нүүр', href: '/' }, { label: 'Үйлчилгээ', href: '/services' }, { label: service.title }]} />
          <h1 className="max-w-[900px] text-h2 text-text-on-inverse md:text-h1">{service.title}</h1>
          <p className="max-w-[760px] text-body text-text-on-inverse-muted md:text-body-lg">{service.intro}</p>
        </div>
      </section>

      {/* Content (20:535 / 25:1432) — main column + 320px sidebar */}
      <section className="bg-bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-14 md:px-6 md:py-24 lg:flex-row lg:items-start lg:gap-16">
          <article className="flex min-w-0 flex-1 flex-col gap-6 md:gap-8">
            <h2 className="text-h3 md:text-h2">Бид юу хийдэг вэ?</h2>
            {service.body.map((paragraph) => (
              <p key={paragraph} className="max-w-[740px] text-body text-text-secondary">{paragraph}</p>
            ))}

            <h3 className="text-h4 md:text-h3">Үйлчилгээний хамрах хүрээ</h3>
            <DotList items={service.items} />

            <aside className="flex w-full max-w-[740px] flex-col gap-2 rounded-md border-l-[3px] border-accent-default bg-bg-accent-soft p-4.5 md:gap-2.5 md:px-6 md:py-5">
              <p className="text-body-medium text-text-brand">{service.note.title}</p>
              <p className="text-body-sm text-text-secondary">{service.note.text}</p>
            </aside>

            <h3 className="text-h4 md:text-h3">Түгээмэл асуулт</h3>
            <ServiceFaqAccordion items={service.faq} />
          </article>

          <aside className="flex w-full flex-col gap-6 lg:w-[320px] lg:shrink-0">
            {/* Lawyers card (20:590 / 25:1475) */}
            <div className="flex flex-col gap-3.5 rounded-lg border border-border-default bg-bg-page p-5 md:gap-4 md:p-6">
              <h2 className="text-body-medium text-text-primary">Энэ чиглэлийн хуульчид</h2>
              {lawyers.length === 0 ? (
                <p className="text-body-sm text-text-muted">Хуульчдын мэдээлэл түр ачаалагдсангүй.</p>
              ) : (
                <ul className="flex flex-col gap-3.5 md:gap-4">
                  {lawyers.map((l) => (
                    <li key={l.id}>
                      <Link href={`/lawyers/${l.id}`} className="focus-ring flex min-h-11 items-center gap-3 rounded-sm hover:text-text-brand">
                        <Avatar size="md" initials={initials(l.user.firstName, l.user.lastName)} src={l.user.avatarUrl} className="size-11" />
                        <span className="flex flex-col gap-0.5">
                          <span className="text-body-sm-medium text-text-primary">{shortName(l.user.firstName, l.user.lastName)}</span>
                          <span className="text-caption text-text-muted">{l.yearsOfExperience} жилийн туршлага</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Button asChild size="md" className="w-full">
                <Link href="/contact">Зөвлөгөө авах</Link>
              </Button>
            </div>

            {/* Price card (20:606) — desktop only in the design */}
            <div className="hidden flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-6 lg:flex">
              <h2 className="text-body-medium text-text-primary">Төлбөрийн мэдээлэл</h2>
              <dl className="flex flex-col gap-3">
                {service.pricing.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4">
                    <dt className="text-body-sm text-text-secondary">{row.label}</dt>
                    <dd className="text-right text-body-sm-medium text-text-primary">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
