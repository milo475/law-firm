// Figma: 01 Public Site / Public / 10 Contact / Desktop (22:843) + Mobile (26:1538)
import type { Metadata } from 'next';
import { ContactClockIcon, ContactMailIcon, ContactPhoneIcon, ContactPinIcon, MapPinIcon } from '@/components/icons';
import { PageHeader } from '@/components/ui/page-header';
import type { FirmSettings } from '@/lib/api';
import { loadFirmSettings } from '@/lib/firm';
import { formatPhone, phoneHref } from '@/lib/format';
import { ContactForm } from './contact-form';

export const metadata: Metadata = { title: 'Холбоо барих', description: 'Тулгуур Хуулийн Фирмтэй холбогдох: хаяг, утас, и-мэйл, хүсэлт илгээх форм.' };

const tel = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`;

type OfficeLine = { text: string; href?: string; desktopOnly?: boolean };
/** Address, main phone, e-mail and hours come from the firm settings; the second lines are fixed office notes. */
const office = (firm: FirmSettings): { label: string; Icon: typeof ContactPinIcon; lines: OfficeLine[] }[] => [
  {
    label: 'Хаяг',
    Icon: ContactPinIcon,
    lines: [{ text: firm.address }],
  },
  {
    label: 'Утас',
    Icon: ContactPhoneIcon,
    lines: [
      { text: formatPhone(firm.phone), href: phoneHref(firm.phone) },
      { text: '+976 9911-2233 (яаралтай)', href: tel('+976 9911-2233'), desktopOnly: true },
    ],
  },
  {
    label: 'Имэйл',
    Icon: ContactMailIcon,
    lines: [
      { text: firm.email, href: `mailto:${firm.email}` },
      { text: 'portal@tulguur.mn', href: 'mailto:portal@tulguur.mn', desktopOnly: true },
    ],
  },
  {
    label: 'Ажлын цаг',
    Icon: ContactClockIcon,
    lines: [
      { text: firm.workingHours },
      { text: 'Бямба 10:00–14:00 (урьдчилан захиалгаар)', desktopOnly: true },
    ],
  },
];

export default async function ContactPage() {
  const firm = await loadFirmSettings();
  return (
    <>
      <PageHeader
        title="Холбоо барих"
        description="Асуудлаа товч бичиж илгээнэ үү. Ажлын 1 өдрийн дотор хуульч тань руу холбогдоно."
        crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Холбоо барих' }]}
      />

      {/* Contact — white band; desktop: form card + 420px info column (gap 64); mobile: flat form, then bg-page info section */}
      <section className="bg-bg-surface">
        <div className="mx-auto max-w-[1200px] px-5 pt-14 md:px-6 lg:flex lg:items-start lg:gap-16 lg:py-24">
          {/* Form — bordered card from md up (p-40 on desktop), flat on mobile */}
          <div className="flex min-w-0 flex-1 flex-col gap-5 md:gap-6 md:rounded-lg md:border md:border-border-default md:bg-bg-surface md:p-8 lg:p-10">
            <h2 className="text-h3 text-text-primary">Зөвлөгөө хүсэх</h2>
            <ContactForm />
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
                          <a href={line.href} className="focus-ring rounded-sm hover:text-text-brand">{line.text}</a>
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
