const TONES: Record<string, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  info: 'bg-brand-100 text-brand-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
};

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: keyof typeof TONES }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function caseStatusTone(status: string): keyof typeof TONES {
  return ({ NEW: 'info', IN_PROGRESS: 'warning', WAITING: 'neutral', CLOSED: 'success' } as const)[status] ?? 'neutral';
}

export function invoiceStatusTone(status: string): keyof typeof TONES {
  return (
    ({ DRAFT: 'neutral', SENT: 'info', PAID: 'success', OVERDUE: 'danger', CANCELLED: 'neutral' } as const)[status] ??
    'neutral'
  );
}
