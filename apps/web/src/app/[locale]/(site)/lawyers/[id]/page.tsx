// Figma: 01 Public Site / Public / 04 Lawyer Detail / Desktop (19:367) + Mobile (24:1379)
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { ApiError, apiFetch, type LawyerProfile } from '@/lib/api';
import { alternateLanguages } from '@/lib/seo';
import { cn, shortName } from '@/lib/utils';

export const revalidate = 60;

type Params = { params: Promise<{ locale: string; id: string }> };

async function loadLawyer(id: string): Promise<LawyerProfile | null> {
  try {
    return await apiFetch<LawyerProfile>(`/lawyers/${id}`, { next: { revalidate: 60 } });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'lawyerDetail' });
  const lawyer = await loadLawyer(id);
  if (!lawyer) return { title: t('notFound') };
  const name = shortName(lawyer.user.firstName, lawyer.user.lastName);
  return {
    title: `${name} — ${lawyer.title}`,
    description: lawyer.bio.slice(0, 160),
    alternates: { languages: alternateLanguages(`/lawyers/${id}`) },
  };
}

/** Split a free-text education string into list items: on newlines, or after a "(year)," boundary. */
function educationItems(education: string): string[] {
  const items = education
    .split(/\n+|(?<=\))\s*[,;]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : [education];
}

/** Figma "List" — 6px gold dot + Body/Base text. */
function DotList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 lg:gap-3">
          <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-full bg-accent-default lg:mt-2.5" />
          <span className="text-body text-text-secondary">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Figma "Contact card": label/value rows + primary button (desktop only). */
async function ContactCard({ lawyer, withButton, className }: { lawyer: LawyerProfile; withButton?: boolean; className?: string }) {
  const t = await getTranslations('lawyerDetail');
  const rowLink = 'focus-ring rounded-sm text-body-sm-medium text-text-primary hover:text-text-brand';
  return (
    <div className={cn('flex flex-col gap-3.5 rounded-lg bg-bg-page p-5 lg:gap-4 lg:border lg:border-border-default lg:bg-bg-surface lg:p-6', className)}>
      <p className="text-body-medium text-text-primary">{t('contactTitle')}</p>
      {lawyer.user.phone && (
        <div className="flex items-start justify-between gap-4">
          <span className="text-body-sm text-text-muted">{t('phone')}</span>
          <a href={`tel:${lawyer.user.phone}`} className={rowLink}>{lawyer.user.phone}</a>
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <span className="text-body-sm text-text-muted">{t('email')}</span>
        <a href={`mailto:${lawyer.user.email}`} className={cn(rowLink, 'break-all text-right')}>{lawyer.user.email}</a>
      </div>
      {withButton && (
        <Button asChild size="md" className="w-full">
          <Link href="/contact">{t('bookCta')}</Link>
        </Button>
      )}
    </div>
  );
}

export default async function LawyerDetailPage({ params }: Params) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [t, tCommon, tLawyers, lawyer] = await Promise.all([
    getTranslations('lawyerDetail'),
    getTranslations('common'),
    getTranslations('lawyers'),
    loadLawyer(id),
  ]);
  if (!lawyer) notFound();
  const name = shortName(lawyer.user.firstName, lawyer.user.lastName);
  const crumbs = [{ label: tCommon('home'), href: '/' }, { label: tLawyers('crumb'), href: '/lawyers' }, { label: name }];
  const summary = `${lawyer.specializations.slice(0, 2).join(', ') || lawyer.title} · ${tCommon('yearsOfExperience', { years: lawyer.yearsOfExperience })}`;

  // Desktop: left column 360px (photo + contact card), right column (profile + bio). Mobile: single column, contact card last.
  const leftCol = 'lg:grid lg:grid-cols-[360px_1fr] lg:gap-14';

  return (
    <>
      {/* Breadcrumb bar (desktop) */}
      <div className="hidden bg-bg-page lg:block">
        <div className="mx-auto max-w-[1200px] px-6 py-6">
          <Breadcrumb items={crumbs} />
        </div>
      </div>

      {/* Profile */}
      <section className="bg-bg-page">
        <div className={cn('mx-auto flex max-w-[1200px] flex-col gap-5 px-5 py-8 md:px-6 lg:pb-0 lg:pt-16', leftCol)}>
          <Breadcrumb items={crumbs} className="lg:hidden" />
          <div className="flex flex-col gap-6">
            <ImagePlaceholder src={lawyer.user.avatarUrl} className="h-[320px] rounded-lg lg:h-[440px]" markSize={56} />
            <ContactCard lawyer={lawyer} withButton className="hidden lg:flex" />
          </div>
          <div className="flex flex-col gap-5 lg:gap-7">
            <p className="text-overline text-text-accent">{lawyer.title}</p>
            <h1 className="text-h2 md:text-h1">{name}</h1>
            <p className="max-w-[740px] text-body text-text-secondary md:text-body-lg">{summary}</p>
            {lawyer.specializations.length > 0 && (
              <ul className="flex max-w-[740px] flex-wrap gap-2 lg:gap-2.5" aria-label={t('specializations')}>
                {lawyer.specializations.map((s) => (
                  <li key={s} className="rounded-full bg-bg-brand-soft px-3 py-1.5 text-caption text-text-brand lg:px-3.5 lg:py-[7px]">{s}</li>
                ))}
              </ul>
            )}
            <Button asChild size="lg" className="w-full lg:hidden">
              <Link href="/contact">{t('bookCta')}</Link>
            </Button>
            <div aria-hidden className="hidden h-px max-w-[740px] bg-border-default lg:block" />
          </div>
        </div>
      </section>

      {/* Bio — continues the right column on desktop, white block on mobile */}
      <section className="bg-bg-surface lg:bg-bg-page">
        <div className={cn('mx-auto max-w-[1200px] px-5 py-14 md:px-6 lg:pb-16 lg:pt-7', leftCol)}>
          <div className="hidden lg:block" />
          <div className="flex max-w-[740px] flex-col gap-5 lg:gap-7">
            <h2 className="text-h3">{t('bio')}</h2>
            {lawyer.bio.split(/\n+/).filter(Boolean).map((p, i) => (
              <p key={i} className="text-body text-text-secondary">{p}</p>
            ))}
            {lawyer.specializations.length > 0 && (
              <>
                <h3 className="text-h4">{t('specializations')}</h3>
                <DotList items={lawyer.specializations} />
              </>
            )}
            {lawyer.education && (
              <>
                <h3 className="text-h4">{t('education')}</h3>
                <DotList items={educationItems(lawyer.education)} />
              </>
            )}
            <ContactCard lawyer={lawyer} className="lg:hidden" />
          </div>
        </div>
      </section>
    </>
  );
}
