// Figma: Design System / Footer (13:59, 1440) + Footer mobile (23:62, 390)
import { getTranslations } from 'next-intl/server';
import { COMMITMENTS } from '@/content/commitments';
import { SERVICES } from '@/content/services';
import { SOCIAL_LINKS } from '@/content/social';
import { Link } from '@/i18n/navigation';
import { loadFirmSettings } from '@/lib/firm';
import { formatPhone, phoneHref } from '@/lib/format';
import { Logo } from './logo';

const link = 'focus-ring rounded-sm text-body-sm text-text-on-inverse-muted hover:text-text-on-inverse';

/** Contacts and the legal name come from the firm settings an ADMIN edits on /admin/settings. */
export async function Footer() {
  const year = new Date().getFullYear();
  const [firm, t, tNav, tService] = await Promise.all([
    loadFirmSettings(),
    getTranslations('footer'),
    getTranslations('nav'),
    getTranslations('services.catalog'),
  ]);

  const services = SERVICES.map((service) => ({ label: tService(`${service.slug}.title`), href: `/services/${service.slug}` }));
  const company = [
    { label: tNav('about'), href: '/about' },
    { label: tNav('lawyers'), href: '/lawyers' },
    { label: t('news'), href: '/news' },
    { label: tNav('faq'), href: '/faq' },
    // The careers mailbox only appears once its address is confirmed (content/commitments.ts).
    ...(COMMITMENTS.careersEmail
      ? [{ label: t('careers'), href: `mailto:${COMMITMENTS.careersEmail}` }]
      : [{ label: t('services'), href: '/services' }]),
  ];

  return (
    <footer className="bg-bg-inverse text-text-on-inverse">
      {/* Desktop */}
      <div className="mx-auto hidden max-w-[1200px] flex-col gap-12 px-6 pb-8 pt-16 md:flex">
        {/* Figma gap is 64px at 1440; narrower screens need less room (and may wrap) so the row never overflows. */}
        <div className="flex flex-wrap gap-8 lg:gap-12 xl:gap-16">
          <div className="flex w-[340px] shrink-0 flex-col gap-4">
            <Logo theme="dark" variant="lockup" />
            <p className="w-[300px] text-body-sm text-text-on-inverse-muted">{t('description')}</p>
          </div>
          <FooterColumn title={t('services')} items={services} />
          <FooterColumn title={t('company')} items={company} />
          <div className="flex flex-1 flex-col gap-3.5">
            <p className="text-body-medium">{t('contact')}</p>
            <p className="text-body-sm text-text-on-inverse-muted">{firm.address}</p>
            <a href={phoneHref(firm.phone)} className={link}>{formatPhone(firm.phone)}</a>
            <a href={`mailto:${firm.email}`} className={link}>{firm.email}</a>
            <p className="text-body-sm text-text-on-inverse-muted">{firm.workingHours}</p>
            {SOCIAL_LINKS.map((social) => (
              <a key={social.href} href={social.href} target="_blank" rel="noreferrer noopener" className={link}>{social.label}</a>
            ))}
          </div>
        </div>
        <div className="h-px w-full bg-border-inverse" />
        <div className="flex items-center justify-between text-caption text-text-on-inverse-muted">
          <p>© {year} {firm.name}. {t('rights')}</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="focus-ring rounded-sm hover:text-text-on-inverse">{t('privacy')}</Link>
            <Link href="/terms" className="focus-ring rounded-sm hover:text-text-on-inverse">{t('terms')}</Link>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-7 px-5 pb-7 pt-10 md:hidden">
        <Logo theme="dark" variant="lockup" />
        <p className="text-body-sm text-text-on-inverse-muted">{t('descriptionShort')}</p>
        <div className="flex flex-col gap-3">
          <p className="text-body-medium">{t('services')}</p>
          <div className="flex flex-wrap gap-x-2.5 gap-y-2.5">
            {SERVICES.map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className={link}>{t(`serviceShort.${service.slug}`)}</Link>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-body-medium">{t('contact')}</p>
          <div className="flex flex-wrap gap-x-2.5 gap-y-2.5 text-body-sm text-text-on-inverse-muted">
            <a href={phoneHref(firm.phone)} className={link}>{formatPhone(firm.phone)}</a>
            <a href={`mailto:${firm.email}`} className={link}>{firm.email}</a>
            <span>{firm.address}</span>
            <span>{firm.workingHours}</span>
            {SOCIAL_LINKS.map((social) => (
              <a key={social.href} href={social.href} target="_blank" rel="noreferrer noopener" className={link}>{social.label}</a>
            ))}
          </div>
        </div>
        <div className="h-px w-full bg-border-inverse" />
        <p className="text-caption text-text-on-inverse-muted">© {year} {firm.name}</p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div className="flex flex-1 flex-col gap-3.5">
      <p className="text-body-medium">{title}</p>
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={link}>{item.label}</Link>
      ))}
    </div>
  );
}
