// Figma: Design System / Badge (7:56) — Status pill: dot + label, colour + text (never colour only)
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-2 rounded-full py-[5px] pl-2.5 pr-3 text-body-sm-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        new: 'bg-status-new-bg text-status-new-fg',
        progress: 'bg-status-progress-bg text-status-progress-fg',
        pending: 'bg-status-pending-bg text-status-pending-fg',
        closed: 'bg-status-closed-bg text-status-closed-fg',
        danger: 'bg-status-danger-bg text-status-danger-fg',
      },
    },
    defaultVariants: { tone: 'new' },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ tone, dot = true, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span aria-hidden className="size-2 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}

// ── enum → tone/label maps (CaseStatus, InvoiceStatus, ContactStatus, PostStatus) ──
export const CASE_STATUS_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  NEW: { tone: 'new', label: 'Шинэ' },
  IN_PROGRESS: { tone: 'progress', label: 'Явагдаж буй' },
  WAITING: { tone: 'pending', label: 'Хүлээгдэж буй' },
  CLOSED: { tone: 'closed', label: 'Хаагдсан' },
};

export const INVOICE_STATUS_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  DRAFT: { tone: 'closed', label: 'Ноорог' },
  SENT: { tone: 'new', label: 'Илгээсэн' },
  PAID: { tone: 'progress', label: 'Төлөгдсөн' },
  OVERDUE: { tone: 'danger', label: 'Хугацаа хэтэрсэн' },
  CANCELLED: { tone: 'closed', label: 'Цуцалсан' },
};

export const CONTACT_STATUS_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  NEW: { tone: 'new', label: 'Шинэ' },
  CONTACTED: { tone: 'progress', label: 'Холбогдсон' },
  CLOSED: { tone: 'closed', label: 'Хаагдсан' },
};

export function StatusBadge({ map, status, className }: { map: Record<string, { tone: BadgeTone; label: string }>; status: string; className?: string }) {
  const entry = map[status] ?? { tone: 'closed' as BadgeTone, label: status };
  return <Badge tone={entry.tone} className={className}>{entry.label}</Badge>;
}

// ── temporary compatibility for pages not yet migrated (removed in the pages step) ──
export function caseStatusTone(status: string): BadgeTone { return CASE_STATUS_BADGE[status]?.tone ?? 'closed'; }
export function invoiceStatusTone(status: string): BadgeTone { return INVOICE_STATUS_BADGE[status]?.tone ?? 'closed'; }
