// Figma: 01 Public Site / Public / 11 404 / Desktop (22:982) + Mobile (26:1642)
import Link from 'next/link';
import { ChevronRightIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/ui/footer';
import { NavHeader } from '@/components/ui/nav-header';

const QUICK_LINKS = [
  { href: '/services', title: 'Үйлчилгээ', caption: '6 чиглэлийн жагсаалт' },
  { href: '/lawyers', title: 'Хуульчид', caption: '24 мэргэжилтэн' },
  { href: '/news', title: 'Мэдээ', caption: 'Сүүлийн нийтлэлүүд' },
  { href: '/portal', title: 'Портал', caption: 'Хэргээ хянах' },
];

export default function NotFound() {
  return (
    <>
      <NavHeader />
      <main className="flex flex-1 flex-col bg-bg-surface">
        {/* Error — centred column: 404 numeral, H2, copy, buttons, quick links (py-160 desktop / py-80 mobile) */}
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-5 px-5 py-20 text-center md:gap-8 md:px-6 md:py-40">
          <p className="font-serif text-[80px] font-bold leading-[88px] tracking-[-0.5px] text-text-accent md:text-[120px] md:leading-[128px] md:tracking-[-1px]" aria-hidden>
            404
          </p>
          <h1 className="text-h3 text-text-brand md:text-h2">Хуудас олдсонгүй</h1>
          <p className="max-w-[560px] text-body text-text-secondary md:text-body-lg">
            Таны хайсан хуудас устсан, нүүсэн эсвэл хаяг нь буруу бичигдсэн байж магадгүй.
            <span className="hidden md:inline"> Доорх холбоосуудаас үргэлжлүүлнэ үү.</span>
          </p>

          {/* Buttons — lg (56px); side by side on desktop, stacked full-width on mobile */}
          <div className="flex w-full flex-col gap-5 md:w-auto md:flex-row md:gap-3 md:pt-2">
            <Button asChild size="lg" className="w-full md:w-auto"><Link href="/">Нүүр хуудас руу</Link></Button>
            <Button asChild variant="secondary" size="lg" className="w-full md:w-auto"><Link href="/contact">Холбоо барих</Link></Button>
          </div>

          {/* Quick links — desktop: four 220px bg-page cards (gap 32); mobile: full-width rows with chevron */}
          <nav aria-label="Түргэн холбоосууд" className="w-full pt-4 md:w-auto md:pt-8">
            <ul className="flex flex-col gap-3 md:flex-row md:gap-8">
              {QUICK_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="focus-ring flex items-center justify-between rounded-md bg-bg-page px-5 py-4 text-left transition-colors hover:bg-bg-brand-soft md:w-[220px] md:flex-col md:items-start md:gap-1.5 md:px-6 md:py-5"
                  >
                    <span className="flex flex-col gap-0.5 md:gap-1.5">
                      <span className="text-body-medium text-text-brand">{item.title}</span>
                      <span className="text-caption text-text-muted">{item.caption}</span>
                    </span>
                    <ChevronRightIcon size={7} className="shrink-0 text-text-accent md:hidden" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>
      <Footer />
    </>
  );
}
