// Figma: 02 Client Portal / Portal / 01 Login / Desktop (28:34) + Mobile (35:928) — shared auth layout
import Link from 'next/link';
import { BackChevronIcon, BackIcon, CheckCircleIcon } from '@/components/icons';
import { Logo } from '@/components/ui/logo';
import { loadFirmSettings } from '@/lib/firm';
import { formatPhone } from '@/lib/format';
import { cn } from '@/lib/utils';

const FEATURES = [
  'Хэргийн явцын бодит цагийн мэдээлэл',
  'Баримт бичгээ аюулгүй хадгалах, татах',
  'Нэхэмжлэх, төлбөрийн түүх',
  'Хуульчтай шууд харилцах суваг',
];
const SUPPORT_EMAIL = 'portal@lawfirm.mn';

interface AuthCardProps {
  children: React.ReactNode;
  /** Extra classes for the card body (e.g. a tighter `gap-5` on Register). */
  className?: string;
  /**
   * Mobile top chrome. Default: the navy brand block (Login mobile 35:929).
   * Pass a nav header to render the 64px "back + title" bar instead (Register mobile 35:969).
   */
  mobileNav?: { title: string; backHref: string };
}

/**
 * Auth layout shared by login / register / forgot-password.
 * Desktop (xl+): 560px navy brand panel on the left + centred 440px card on bg-page.
 * Below xl: brand block (or nav header) stacked on top, then the form on a white surface
 * (560 + 2×120 padding + 440 needs the full 1280px).
 */
export async function AuthCard({ children, className, mobileNav }: AuthCardProps) {
  // Server component (login / register / forgot-password pages): the support phone is the firm's phone from the settings.
  const supportPhone = formatPhone((await loadFirmSettings()).phone);
  return (
    <main className="flex flex-1 flex-col xl:flex-row">
      {/* Brand panel — Figma "Brand panel" 28:35 / mobile "Brand" 35:929 */}
      <aside
        className={cn(
          'flex flex-col items-center gap-4 bg-bg-inverse px-5 py-10 text-center',
          'xl:sticky xl:top-0 xl:h-screen xl:w-[560px] xl:shrink-0 xl:items-start xl:justify-between xl:p-16 xl:text-left',
          mobileNav && 'hidden xl:flex',
        )}
      >
        <Logo theme="dark" variant="lockup" />
        <div className="flex flex-col items-center gap-4 xl:max-w-[432px] xl:items-start xl:gap-5">
          <p className="font-serif text-[26px] font-semibold leading-[34px] tracking-[-0.2px] text-text-on-inverse xl:text-h2 xl:text-text-on-inverse">
            Харилцагчийн портал
          </p>
          <p className="max-w-[320px] text-body-sm text-text-on-inverse-muted xl:hidden">Хэргийн явц, баримт, нэхэмжлэхээ нэг дороос хянаарай.</p>
          <p className="hidden text-body-lg text-text-on-inverse-muted xl:block">
            Хэргийнхээ явц, баримт бичиг, нэхэмжлэхээ нэг дороос хянаарай. Хуульчтайгаа шууд мессежээр холбогдоно.
          </p>
          <ul className="hidden flex-col gap-3.5 xl:flex">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-body text-text-on-inverse">
                <CheckCircleIcon className="shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-body-sm text-text-on-inverse-muted xl:block">
          Асуудал гарвал: {supportPhone} · {SUPPORT_EMAIL}
        </p>
      </aside>

      {mobileNav && (
        <header className="flex h-16 items-center gap-2.5 border-b border-border-default bg-bg-surface pl-4 pr-2 xl:hidden">
          <Link href={mobileNav.backHref} aria-label="Буцах" className="focus-ring flex size-11 items-center justify-center rounded-md text-text-primary">
            <BackIcon />
          </Link>
          <span className="text-body-medium text-text-primary">{mobileNav.title}</span>
        </header>
      )}

      {/* Form panel — Figma "Form panel" 28:63 / mobile "Form" 35:938 */}
      <div className="flex flex-1 flex-col items-center bg-bg-surface md:justify-center md:bg-bg-page md:px-6 md:py-12 xl:px-[120px]">
        <div
          className={cn(
            'flex w-full flex-col gap-5 bg-bg-surface px-5 py-8',
            'md:max-w-[440px] md:gap-6 md:rounded-lg md:border md:border-border-default md:p-10 md:shadow-menu',
            className,
          )}
        >
          {children}
        </div>
        {!mobileNav && <p className="px-5 pb-8 text-caption text-text-muted md:hidden">Асуудал гарвал: {supportPhone}</p>}
      </div>
    </main>
  );
}

/** Card title + optional description (Figma 28:65 / 28:66). Mobile uses the 26/34 "Mobile/H2" size. */
export function AuthHeading({
  title,
  mobileTitle,
  description,
  descriptionClassName,
}: {
  title: string;
  mobileTitle?: string;
  description?: string;
  descriptionClassName?: string;
}) {
  return (
    <>
      <h1 className="font-serif text-[26px] font-semibold leading-[34px] tracking-[-0.2px] text-text-primary md:text-h2">
        {mobileTitle ? (
          <>
            <span className="md:hidden">{mobileTitle}</span>
            <span className="hidden md:inline">{title}</span>
          </>
        ) : (
          title
        )}
      </h1>
      {description && <p className={cn('text-body text-text-secondary', descriptionClassName)}>{description}</p>}
    </>
  );
}

/** "‹ Буцах" row at the top of the card (Figma 28:125). Link when `href` is given, otherwise a button. */
export function AuthBackLink({ label, href, onClick }: { label: string; href?: string; onClick?: () => void }) {
  const className = 'focus-ring -my-[11px] inline-flex min-h-11 items-center gap-2 self-start rounded-sm text-body-sm-medium text-text-secondary hover:text-text-brand';
  const content = (
    <>
      <BackChevronIcon size={8} className="shrink-0" />
      {label}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

/** "Бүртгэлгүй юу? Бүртгүүлэх" line at the bottom of the card (Figma 28:91). */
export function AuthSwitchLink({ prompt, href, label }: { prompt: string; href: string; label: string }) {
  return (
    <p className="flex justify-center gap-1.5 text-body-sm text-text-secondary">
      {prompt}
      <Link href={href} className="focus-ring rounded-sm text-body-sm-medium text-text-accent hover:underline">
        {label}
      </Link>
    </p>
  );
}
