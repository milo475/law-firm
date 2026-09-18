// Figma: 01 Public Site / Public / 10 Contact / Desktop (22:843) + Mobile (26:1538)
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ContactClockIcon, ContactFacebookIcon, ContactMailIcon, ContactPhoneIcon, ContactPinIcon, MapPinIcon } from '@/components/icons';
import { PageHeader } from '@/components/ui/page-header';
import { SOCIAL_LINKS } from '@/content/social';
import { Link } from '@/i18n/navigation';
import { alternateLanguages } from '@/lib/seo';
import type { FirmSettings } from '@/lib/api';
import { loadFirmSettings } from '@/lib/firm';
import { formatPhone, phoneHref } from '@/lib/format';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return { title: t('metaTitle'), description: t('metaDescription'), alternates: { languages: alternateLanguages('/contact') } };
}

/** Signed-out visitors are sent to the sign-in page and come back to the form with the chosen type. */
const REQUEST_TYPES = ['LAWYER', 'CONSULTATION'] as const;

type OfficeLine = { text: string; href?: string; desktopOnly?: boolean; external?: boolean };
/** Address, phone, e-mail and hours come from the firm settings an ADMIN edits on /admin/settings. */
const office = (firm: FirmSettings, t: (key: string) => string): { label: string; Icon: typeof ContactPinIcon; lines: OfficeLine[] }[] => [
  {
    label: t('office.address'),
    Icon: ContactPinIcon,
    lines: [{ text: firm.address }],
  },
  {
    label: t('office.phone'),
    Icon: ContactPhoneIcon,
    lines: [{ text: formatPhone(firm.phone), href: phoneHref(firm.phone) }],
  },
  {
    label: t('office.email'),
    Icon: ContactMailIcon,
    lines: [{ text: firm.email, href: `mailto:${firm.email}` }],
  },
  {
    label: t('office.hours'),
    Icon: ContactClockIcon,
    lines: [{ text: firm.workingHours }],
  },
  {
    label: t('office.social'),
    Icon: ContactFacebookIcon,
    lines: SOCIAL_LINKS.map((social) => ({ text: social.label, href: social.href, external: true })),
  },
];

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [firm, t, tCommon] = await Promise.all([loadFirmSettings(), getTranslations('contact'), getTranslations('common')]);
  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        crumbs={[{ label: tCommon('home'), href: '/' }, { label: t('crumb') }]}
      />

      {/* Contact — white band; desktop: form card + 420px info column (gap 64); mobile: flat form, then bg-page info section */}
      <section className="bg-bg-surface">
        <div className="mx-auto max-w-[1200px] px-5 pt-14 md:px-6 lg:flex lg:items-start lg:gap-16 lg:py-24">
          {/* Request CTAs — bordered card from md up; requests are sent from the client portal (sign-in required) */}
          <div className="flex min-w-0 flex-1 flex-col gap-5 md:gap-6 md:rounded-lg md:border md:border-border-default md:bg-bg-surface md:p-8 lg:p-10">
            <div className="flex flex-col gap-2">
              <h2 className="text-h3 text-text-primary">{t('requests.title')}</h2>
              <p className="text-body text-text-secondary">{t('requests.description')}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {REQUEST_TYPES.map((type) => (
                <Link
                  key={type}
                  href={`/portal/requests/new?type=${type}`}
                  className="focus-ring group flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-5 transition-colors hover:border-brand-primary hover:bg-bg-brand-soft"
                >
                  <span className="text-h4 text-text-primary group-hover:text-text-brand">{t(`requests.${type}.title`)}</span>
                  <span className="text-body-sm text-text-secondary">{t(`requests.${type}.description`)}</span>
                  <span className="mt-auto pt-2 text-body-sm-medium text-text-accent">{t('requests.cta')} →</span>
                </Link>
              ))}
            </div>
            <p className="text-body-sm text-text-secondary">
              {t('requests.signUpPrefix')}{' '}
              <Link href="/portal/register" className="focus-ring rounded-sm text-text-accent hover:underline">{t('requests.signUpLink')}</Link>{' '}
              {t('requests.signUpSuffix', { phone: formatPhone(firm.phone) })}
            </p>
          </div>

          {/* Info — mobile: full-bleed bg-page section; desktop: bg-page card (p-28) + map placeholder */}
          <aside className="-mx-5 mt-14 flex flex-col gap-5 bg-bg-page px-5 py-14 md:-mx-6 md:px-6 lg:mx-0 lg:mt-0 lg:w-[420px] lg:shrink-0 lg:gap-6 lg:bg-transparent lg:p-0">
            <div className="flex flex-col gap-5 lg:rounded-lg lg:bg-bg-page lg:p-7">
              <h2 className="text-h3 text-text-primary lg:text-h4">{t('office.title')}</h2>
              {office(firm, t).map(({ label, Icon, lines }) => (
                <div key={label} className="flex items-start gap-3.5">
                  <span className="shrink-0 text-text-accent" aria-hidden>
                    <Icon size={40} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-body-sm-medium text-text-primary">{label}</p>
                    {lines.map((line) => (
                      <p key={line.text} className={line.desktopOnly ? 'hidden text-body-sm text-text-secondary lg:block' : 'text-body-sm text-text-secondary'}>
                        {line.href ? (
                          <a
                            href={line.href}
                            className="focus-ring rounded-sm hover:text-text-brand"
                            {...(line.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                          >
                            {line.text}
                          </a>
                        ) : (
                          line.text
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Map placeholder — navy-100 area with pin + caption (300px desktop / 200px mobile) */}
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-lg bg-navy-100 text-navy-600 lg:h-[300px] lg:gap-2.5" role="img" aria-label={t('map.label')}>
              <MapPinIcon size={14} />
              <span className="text-caption">{t('map.caption')}</span>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
