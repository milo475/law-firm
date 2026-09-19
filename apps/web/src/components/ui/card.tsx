// Figma: Design System / Card (11:43) — Type: Service / News / Lawyer / Case
import Link from 'next/link';
import { ArrowRightIcon, ScalesIcon } from '@/components/icons';
import { cn, initials as toInitials } from '@/lib/utils';
import { Avatar } from './avatar';
import { Badge, type BadgeTone } from './badge';

/** Plain surface: white, border-default, radius-lg. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('overflow-hidden rounded-lg border border-border-default bg-bg-surface', className)} {...props} />;
}

// ── Type=Service ─────────────────────────────────────────────────────────────
export function ServiceCard({ title, description, href, cta, icon, className }: { title: string; description: string; href: string; cta: string; icon?: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('flex flex-col items-start gap-4 p-8', className)}>
      <span className="size-14 shrink-0">{icon ?? <ScalesIcon />}</span>
      <h3 className="text-h4">{title}</h3>
      <p className="text-body text-text-secondary">{description}</p>
      <Link href={href} className="focus-ring mt-auto inline-flex h-11 items-center gap-2 rounded-sm text-body-medium text-text-accent hover:underline">
        {cta}
        <ArrowRightIcon size={12} />
      </Link>
    </Card>
  );
}

// ── Type=News ────────────────────────────────────────────────────────────────
export function NewsCard({ overline, title, excerpt, meta, href, imageUrl, className }: { overline: string; title: string; excerpt: string; meta: string; href: string; imageUrl?: string | null; className?: string }) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <Link href={href} className="focus-ring block" aria-label={title} tabIndex={-1}>
        <ImagePlaceholder src={imageUrl} className="h-[207px]" markSize={64} />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <p className="text-overline text-text-accent">{overline}</p>
        <h3 className="text-h4">
          <Link href={href} className="focus-ring rounded-sm hover:text-text-brand">{title}</Link>
        </h3>
        <p className="text-body-sm text-text-secondary line-clamp-3">{excerpt}</p>
        <p className="mt-auto pt-1 text-caption text-text-muted">{meta}</p>
      </div>
    </Card>
  );
}

// ── Type=Lawyer ──────────────────────────────────────────────────────────────
export function LawyerCard({ name, title, experience, href, imageUrl, className }: { name: string; title: string; experience: string; href: string; imageUrl?: string | null; className?: string }) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <Link href={href} className="focus-ring block" aria-label={name} tabIndex={-1}>
        <ImagePlaceholder src={imageUrl} className="h-[340px]" markSize={60} />
      </Link>
      <div className="flex flex-col gap-1.5 px-6 pb-6 pt-5">
        <h3 className="text-h4">
          <Link href={href} className="focus-ring rounded-sm hover:text-text-brand">{name}</Link>
        </h3>
        <p className="text-body-sm text-text-secondary">{title}</p>
        <p className="text-caption text-text-accent">{experience}</p>
      </div>
    </Card>
  );
}

// ── Type=Case ────────────────────────────────────────────────────────────────
export function CaseCard({ caseNumber, title, status, lawyer, footer, href, className }: {
  caseNumber: string;
  title: string;
  status: { tone: BadgeTone; label: string };
  lawyer: { firstName: string; lastName: string; avatarUrl?: string | null };
  footer?: string;
  href: string;
  className?: string;
}) {
  return (
    <Card className={cn('flex flex-col gap-3.5 p-6', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption text-text-muted">{caseNumber}</span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <h3 className="text-h4">
        <Link href={href} className="focus-ring rounded-sm hover:text-text-brand">{title}</Link>
      </h3>
      <div className="flex items-center gap-2.5">
        <Avatar size="sm" initials={toInitials(lawyer.firstName, lawyer.lastName)} src={lawyer.avatarUrl} />
        <span className="text-body-sm text-text-secondary">{lawyer.lastName.charAt(0)}. {lawyer.firstName}</span>
      </div>
      {footer && (
        <>
          <div className="h-px w-full bg-border-subtle" />
          <p className="text-body-sm-medium text-text-brand">{footer}</p>
        </>
      )}
    </Card>
  );
}

/** Figma "Image placeholder": navy-100 area with a navy-200 outlined mark, or the real image. */
export function ImagePlaceholder({ src, className, markSize = 64 }: { src?: string | null; className?: string; markSize?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn('w-full object-cover', className)} />;
  }
  return (
    <div className={cn('flex w-full items-center justify-center bg-navy-100', className)} aria-hidden>
      <span className="rounded-[6px] border-2 border-navy-200" style={{ width: markSize, height: markSize }} />
    </div>
  );
}
