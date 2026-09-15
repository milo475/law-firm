import type { CaseEventType, CaseStatus } from '../generated/prisma/enums.js';

/** Upcoming event row used by the admin dashboard. */
export interface AdminUpcomingEvent {
  id: string;
  type: CaseEventType;
  title: string;
  eventDate: string;
  case: { id: string; caseNumber: string; title: string };
}

/** GET /admin/stats — the block matching the caller's role is present. */
export interface AdminStats {
  role: 'ADMIN' | 'LAWYER';
  upcomingEvents: AdminUpcomingEvent[];
  lawyer?: {
    openCases: number;
    upcomingEventCount: number;
    unpaidInvoiceCount: number;
    unpaidInvoiceTotal: string;
  };
  admin?: {
    casesByStatus: Record<CaseStatus, number>;
    totalCases: number;
    activeLawyers: number;
    invoicesThisMonth: { count: number; total: string };
    newContactRequests: number;
  };
}
