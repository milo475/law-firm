// Figma: 01 Public Site / Public / 10 Contact / Desktop (22:843) + Mobile (26:1538)
import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactClockIcon, ContactFacebookIcon, ContactMailIcon, ContactPhoneIcon, ContactPinIcon, MapPinIcon } from '@/components/icons';
import { PageHeader } from '@/components/ui/page-header';
import { SOCIAL_LINKS } from '@/content/social';
import type { FirmSettings } from '@/lib/api';
import { loadFirmSettings } from '@/lib/firm';
import { formatPhone, phoneHref } from '@/lib/format';

export const metadata: Metadata = { title: 'Холбоо барих', description: 'Strategy Law Firm-тэй холбогдох: хаяг, утас, и-мэйл, өмгөөлөгч авах, зөвлөгөө авах хүсэлт.' };

/** Signed-out visitors are sent to the sign-in page and come back to the form with the chosen type. */
const REQUEST_OPTIONS = [
  { type: 'LAWYER', title: 'Өмгөөлөгч авах', description: 'Хэргийг тань хариуцаж, шүүх болон байгууллагад төлөөлөх өмгөөлөгч томилуулна.' },
  { type: 'CONSULTATION', title: 'Зөвлөгөө авах', description: 'Асуудлаа тодруулж, дараагийн алхмыг зөвлөх хуульчтай холбогдоно.' },
] as const;

type OfficeLine = { text: string; href?: string; desktopOnly?: boolean; external?: boolean };
/** Address, phone, e-mail and hours come from the firm settings an ADMIN edits on /admin/settings. */
const office = (firm: FirmSettings): { label: string; Icon: typeof ContactPinIcon; lines: OfficeLine[] }[] => [
  {
    label: 'Хаяг',
    Icon: ContactPinIcon,
    lines: [{ text: firm.address }],
  },
  {
    label: 'Утас',
    Icon: ContactPhoneIcon,
    lines: [{ text: formatPhone(firm.phone), href: phoneHref(firm.phone) }],
  },
  {
    label: 'Имэйл',
    Icon: ContactMailIcon,
    lines: [{ text: firm.email, href: `mailto:${firm.email}` }],
  },
  {
    label: 'Ажлын цаг',
    Icon: ContactClockIcon,
    lines: [{ text: firm.workingHours }],
  },
  {
    label: 'Олон нийтийн сүлжээ',
    Icon: ContactFacebookIcon,
    lines: SOCIAL_LINKS.map((social) => ({ text: social.label, href: social.href, external: true })),
  },
];

export default async function ContactPage() {
  const firm = await loadFirmSettings();
  return (
    <>
      <PageHeader
        title="Холбоо барих"
        description="Өмгөөлөгч авах, зөвлөгөө авах хүсэлтээ порталаас илгээнэ үү. Ажлын 1 өдрийн дотор хариу өгнө."
        crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Холбоо барих' }]}
      />

      {/* Contact — white band; desktop: form card + 420px info column (gap 64); mobile: flat form, then bg-page info section */}
      <section className="bg-bg-surface">
        <div className="mx-auto max-w-[1200px] px-5 pt-14 md:px-6 lg:flex lg:items-start lg:gap-16 lg:py-24">
          {/* Request CTAs — bordered card from md up; requests are sent from the client portal (sign-in required) */}
          <div className="flex min-w-0 flex-1 flex-col gap-5 md:gap-6 md:rounded-lg md:border md:border-border-default md:bg-bg-surface md:p-8 lg:p-10">
            <div className="flex flex-col gap-2">
              <h2 className="text-h3 text-text-primary">Хүсэлт илгээх</h2>
              <p className="text-body text-text-secondary">
                Өмгөөлөгч авах, зөвлөгөө авах хүсэлтээ харилцагчийн порталаас илгээнэ. Нэвтэрсний дараа хүсэлтийн явц, томилогдсон өмгөөлөгч, нээгдсэн хэргээ нэг дороос харна.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {REQUEST_OPTIONS.map((option) => (
                <Link
                  key={option.type}
                  href={`/portal/requests/new?type=${option.type}`}
                  className="focus-ring group flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-5 transition-colors hover:border-brand-primary hover:bg-bg-brand-soft"
                >
                  <span className="text-h4 text-text-primary group-hover:text-text-brand">{option.title}</span>
                  <span className="text-body-sm text-text-secondary">{option.description}</span>
                  <span className="mt-auto pt-2 text-body-sm-medium text-text-accent">Хүсэлт гаргах →</span>
                </Link>
              ))}
            </div>
            <p className="text-body-sm text-text-secondary">
              Бүртгэлгүй бол{' '}
              <Link href="/portal/register" className="focus-ring rounded-sm text-text-accent hover:underline">бүртгүүлээд</Link>{' '}
              үргэлжлүүлнэ үү. Яаралтай асуудлаар {formatPhone(firm.phone)} дугаарт залгана уу.
            </p>
          </div>

          {/* Info — mobile: full-bleed bg-page section; desktop: bg-page card (p-28) + map placeholder */}
          <aside className="-mx-5 mt-14 flex flex-col gap-5 bg-bg-page px-5 py-14 md:-mx-6 md:px-6 lg:mx-0 lg:mt-0 lg:w-[420px] lg:shrink-0 lg:gap-6 lg:bg-transparent lg:p-0">
            <div className="flex flex-col gap-5 lg:rounded-lg lg:bg-bg-page lg:p-7">
              <h2 className="text-h3 text-text-primary lg:text-h4">Оффисын мэдээлэл</h2>
              {office(firm).map(({ label, Icon, lines }) => (
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
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-lg bg-navy-100 text-navy-600 lg:h-[300px] lg:gap-2.5" role="img" aria-label="Оффисын байршлын газрын зураг">
              <MapPinIcon size={14} />
              <span className="text-caption">Газрын зургийн байрлал</span>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
