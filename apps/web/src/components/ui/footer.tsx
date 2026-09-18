// Figma: Design System / Footer (13:59, 1440) + Footer mobile (23:62, 390)
import Link from 'next/link';
import { SOCIAL_LINKS } from '@/content/social';
import { loadFirmSettings } from '@/lib/firm';
import { formatPhone, phoneHref } from '@/lib/format';
import { Logo } from './logo';

const SERVICES = [
  { label: 'Иргэний эрх зүй', href: '/services/civil' },
  { label: 'Эрүүгийн эрх зүй', href: '/services/criminal' },
  { label: 'Гэр бүлийн эрх зүй', href: '/services/family' },
  { label: 'Бизнесийн эрх зүй', href: '/services/business' },
  { label: 'Хөдөлмөрийн эрх зүй', href: '/services/labor' },
  { label: 'Үл хөдлөх хөрөнгө', href: '/services/real-estate' },
];
const COMPANY = [
  { label: 'Бидний тухай', href: '/about' },
  { label: 'Хуульчид', href: '/lawyers' },
  { label: 'Мэдээ ба нийтлэл', href: '/news' },
  { label: 'Түгээмэл асуулт', href: '/faq' },
  { label: 'Ажлын байр', href: 'mailto:careers@lawfirm.mn' },
];
const link = 'focus-ring rounded-sm text-body-sm text-text-on-inverse-muted hover:text-text-on-inverse';

/** Contacts and the legal name come from the firm settings an ADMIN edits on /admin/settings. */
export async function Footer() {
  const year = new Date().getFullYear();
  const firm = await loadFirmSettings();
  return (
    <footer className="bg-bg-inverse text-text-on-inverse">
      {/* Desktop */}
      <div className="mx-auto hidden max-w-[1200px] flex-col gap-12 px-6 pb-8 pt-16 md:flex">
        {/* Figma gap is 64px at 1440; narrower screens need less room (and may wrap) so the row never overflows. */}
        <div className="flex flex-wrap gap-8 lg:gap-12 xl:gap-16">
          <div className="flex w-[340px] shrink-0 flex-col gap-4">
            <Logo theme="dark" variant="lockup" />
            <p className="w-[300px] text-body-sm text-text-on-inverse-muted">Хууль зүйн мэргэжлийн туслалцаа үзүүлэгч байгууллага. Иргэн, аж ахуйн нэгжид өмгөөлөл, эрх зүйн зөвлөгөө үзүүлнэ.</p>
          </div>
          <FooterColumn title="Үйлчилгээ" items={SERVICES} />
          <FooterColumn title="Компани" items={COMPANY} />
          <div className="flex flex-1 flex-col gap-3.5">
            <p className="text-body-medium">Холбоо барих</p>
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
          <p>© {year} {firm.name}. Бүх эрх хуулиар хамгаалагдсан.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="focus-ring rounded-sm hover:text-text-on-inverse">Нууцлалын бодлого</Link>
            <Link href="/terms" className="focus-ring rounded-sm hover:text-text-on-inverse">Үйлчилгээний нөхцөл</Link>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-7 px-5 pb-7 pt-10 md:hidden">
        <Logo theme="dark" variant="lockup" />
        <p className="text-body-sm text-text-on-inverse-muted">Хууль зүйн мэргэжлийн туслалцаа үзүүлэгч байгууллага.</p>
        <div className="flex flex-col gap-3">
          <p className="text-body-medium">Үйлчилгээ</p>
          <div className="flex flex-wrap gap-x-2.5 gap-y-2.5">
            {SERVICES.map((s) => <Link key={s.href} href={s.href} className={link}>{s.label.replace(' эрх зүй', '').replace(' хөрөнгө', '')}</Link>)}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-body-medium">Холбоо барих</p>
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
