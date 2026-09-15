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
  AWAITING_CONFIRMATION: { tone: 'pending', label: 'Баталгаажуулж буй' },
  PAID: { tone: 'progress', label: 'Төлөгдсөн' },
  OVERDUE: { tone: 'danger', label: 'Хугацаа хэтэрсэн' },
  CANCELLED: { tone: 'closed', label: 'Цуцалсан' },
};

export const CONTACT_STATUS_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  NEW: { tone: 'new', label: 'Шинэ' },
  CONTACTED: { tone: 'progress', label: 'Холбогдсон' },
  CLOSED: { tone: 'closed', label: 'Хаагдсан' },
};

export const POST_STATUS_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  DRAFT: { tone: 'closed', label: 'Ноорог' },
  PUBLISHED: { tone: 'progress', label: 'Нийтэлсэн' },
  ARCHIVED: { tone: 'pending', label: 'Архивласан' },
};

export const DOCUMENT_REQUEST_STATUS_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  PENDING: { tone: 'pending', label: 'Хүлээгдэж буй' },
  SUBMITTED: { tone: 'new', label: 'Илгээсэн' },
  UNDER_REVIEW: { tone: 'new', label: 'Хянагдаж буй' },
  APPROVED: { tone: 'progress', label: 'Батлагдсан' },
  REJECTED: { tone: 'danger', label: 'Буцаагдсан' },
};

/** Client wording: what the client has to do next. */
export const CLIENT_DOCUMENT_REQUEST_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  PENDING: { tone: 'pending', label: 'Илгээгээгүй' },
  SUBMITTED: { tone: 'new', label: 'Хянагдаж байна' },
  UNDER_REVIEW: { tone: 'new', label: 'Хянагдаж байна' },
  APPROVED: { tone: 'progress', label: 'Хүлээн авсан' },
  REJECTED: { tone: 'danger', label: 'Дахин илгээх' },
};

export function StatusBadge({ map, status, className }: { map: Record<string, { tone: BadgeTone; label: string }>; status: string; className?: string }) {
  const entry = map[status] ?? { tone: 'closed' as BadgeTone, label: status };
  return <Badge tone={entry.tone} className={className}>{entry.label}</Badge>;
}

