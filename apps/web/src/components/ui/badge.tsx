// Figma: Design System / Badge (7:56) — Status pill: dot + label, colour + text (never colour only)
import { DOCUMENT_REQUEST_STATUS_LABELS } from '@law-firm/shared/labels';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
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

export const SERVICE_REQUEST_STATUS_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  NEW: { tone: 'new', label: 'Шинэ' },
  ACCEPTED: { tone: 'pending', label: 'Хүлээж авсан' },
  REJECTED: { tone: 'danger', label: 'Татгалзсан' },
  CONVERTED: { tone: 'progress', label: 'Хэрэг нээгдсэн' },
};

export const POST_STATUS_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  DRAFT: { tone: 'closed', label: 'Ноорог' },
  PUBLISHED: { tone: 'progress', label: 'Нийтэлсэн' },
  ARCHIVED: { tone: 'pending', label: 'Архивласан' },
};

export const CASE_MEMBER_ROLE_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  LEAD: { tone: 'progress', label: 'Ахлах' },
  MEMBER: { tone: 'closed', label: 'Гишүүн' },
};

export const TASK_STATUS_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  TODO: { tone: 'closed', label: 'Хийх' },
  IN_PROGRESS: { tone: 'new', label: 'Хийгдэж буй' },
  REVIEW: { tone: 'pending', label: 'Хянах' },
  DONE: { tone: 'progress', label: 'Дууссан' },
  CANCELLED: { tone: 'closed', label: 'Цуцалсан' },
};

export const TASK_PRIORITY_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  LOW: { tone: 'closed', label: 'Бага' },
  MEDIUM: { tone: 'new', label: 'Дунд' },
  HIGH: { tone: 'pending', label: 'Өндөр' },
  URGENT: { tone: 'danger', label: 'Яаралтай' },
};

/**
 * Both surfaces name the status the same way: the badge says where the request stands, the button
 * says what to do about it. The Mongolian wording is the shared label map, so the admin panel, the
 * API's messages and `enums.documentRequestStatus` cannot drift apart.
 */
const DOCUMENT_REQUEST_TONES: Record<string, BadgeTone> = {
  PENDING: 'pending',
  SUBMITTED: 'new',
  UNDER_REVIEW: 'new',
  APPROVED: 'progress',
  REJECTED: 'danger',
};

export const DOCUMENT_REQUEST_STATUS_BADGE: Record<string, { tone: BadgeTone; label: string }> = Object.fromEntries(
  Object.entries(DOCUMENT_REQUEST_STATUS_LABELS).map(([status, label]) => [status, { tone: DOCUMENT_REQUEST_TONES[status], label }]),
);

/** `label` overrides the map copy — localized surfaces (the portal) pass a translated label, the admin panel keeps the map. */
export const TESTIMONIAL_STATUS_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  PENDING: { tone: 'pending', label: 'Хянагдаагүй' },
  PUBLISHED: { tone: 'progress', label: 'Нийтэлсэн' },
  REJECTED: { tone: 'closed', label: 'Татгалзсан' },
};

export function StatusBadge({ map, status, label, className }: { map: Record<string, { tone: BadgeTone; label: string }>; status: string; label?: React.ReactNode; className?: string }) {
  const entry = map[status] ?? { tone: 'closed' as BadgeTone, label: status };
  return <Badge tone={entry.tone} className={className}>{label ?? entry.label}</Badge>;
}

