/**
 * Isomorphic fetch wrapper for the NestJS API.
 *  - base URL from env (NEXT_PUBLIC_API_URL in the browser — `/api` proxies same-origin —
 *    and API_URL on the server)
 *  - always sends cookies (credentials: 'include')
 *  - on 401 it calls POST /auth/refresh once and retries the original request
 *    (also for GET /auth/me: a failed refresh clears the session cookies, so the login redirect cannot loop)
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
    public readonly path?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  /** Plain objects are JSON-encoded; FormData / string bodies are sent as-is. */
  body?: unknown;
  /** Raw Cookie header to forward when calling from the server. */
  cookie?: string;
  /** Internal: do not attempt a refresh on 401. */
  skipRefresh?: boolean;
  /** Next.js fetch extensions (revalidate / tags). */
  next?: { revalidate?: number | false; tags?: string[] };
}

const isServer = typeof window === 'undefined';

export function getApiBaseUrl(): string {
  if (isServer) {
    // NEXT_PUBLIC_API_URL may be the relative proxy path (`/api`), which server-side fetch
    // cannot resolve — the server always needs an absolute URL it can reach directly.
    const url = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
    return (url && !url.startsWith('/') ? url : 'http://localhost:4000').replace(/\/+$/, '');
  }
  return (process.env.NEXT_PUBLIC_API_URL ?? '/api').replace(/\/+$/, '');
}

interface ErrorBody {
  statusCode?: number;
  message?: string;
  error?: string;
  details?: unknown;
  path?: string;
}

/** Auth calls that must never trigger a refresh themselves. */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

// Only one refresh call in flight per browser tab.
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(cookie?: string): Promise<boolean> {
  const run = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: cookie ? { cookie } : undefined,
        cache: 'no-store',
      });
      return res.ok;
    } catch {
      return false;
    }
  };
  if (isServer) return run();
  if (!refreshInFlight) {
    refreshInFlight = run().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiFetch<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, cookie, skipRefresh, headers: initHeaders, next, ...rest } = options;
  const headers = new Headers(initHeaders);
  headers.set('Accept', 'application/json');
  if (cookie) headers.set('cookie', cookie);

  let payload: BodyInit | undefined;
  if (body instanceof FormData || typeof body === 'string' || body instanceof Blob) {
    payload = body as BodyInit;
  } else if (body !== undefined && body !== null) {
    headers.set('Content-Type', 'application/json');
    payload = JSON.stringify(body);
  }

  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const init: RequestInit & { next?: ApiRequestOptions['next'] } = {
    ...rest,
    headers,
    body: payload,
    credentials: 'include',
  };
  if (next) init.next = next;
  else if (!rest.cache) init.cache = 'no-store';

  const response = await fetch(url, init);

  if (response.status === 401 && !skipRefresh && !NO_REFRESH_PATHS.some((prefix) => path.startsWith(prefix))) {
    const refreshed = await tryRefresh(cookie);
    if (refreshed) {
      return apiFetch<T>(path, { ...options, skipRefresh: true });
    }
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    const err = (data ?? {}) as ErrorBody;
    throw new ApiError(
      response.status,
      err.message ?? 'Серверийн алдаа гарлаа. Дахин оролдоно уу',
      err.details,
      err.path ?? path,
    );
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T>(path: string, options?: ApiRequestOptions) => apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: ApiRequestOptions) => apiFetch<T>(path, { ...options, method: 'DELETE' }),
};

// ─── Shared response types (mirrors the API) ─────────────────────────────────

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'LAWYER' | 'CLIENT';
}

export interface PostListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string | null;
  category: 'NEWS' | 'ADVICE' | 'LEGAL_UPDATE';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  viewCount: number;
  author: PublicUser;
}

export interface PostDetail extends PostListItem {
  content: string;
}

export interface LawyerProfile {
  id: string;
  title: string;
  bio: string;
  specializations: string[];
  education: string;
  yearsOfExperience: number;
  user: PublicUser & { email: string; phone: string | null };
}

export interface CurrentUser {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'LAWYER' | 'CLIENT';
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt?: string;
}

export interface CaseListItem {
  id: string;
  caseNumber: string;
  title: string;
  type: string;
  status: 'NEW' | 'IN_PROGRESS' | 'WAITING' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  updatedAt: string;
  client: PublicUser;
  lawyer: PublicUser;
  _count: { events: number; documents: number; invoices: number };
}

export interface CaseDetail extends CaseListItem {
  description: string | null;
}

type CaseMemberRole = 'LEAD' | 'MEMBER';

/** GET /cases/:id/members — the staff team working on a case. */
export interface CaseMemberItem {
  id: string;
  userId: string;
  role: CaseMemberRole;
  createdAt: string;
  user: PublicUser & { email: string };
}

export interface CaseEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  eventDate: string;
  createdBy: PublicUser;
  /** Returned for every event; CLIENT only ever receives visible ones. */
  isVisibleToClient?: boolean;
}

export interface DocumentItem {
  id: string;
  caseId: string;
  name: string;
  mimeType: string;
  size: number;
  isVisibleToClient: boolean;
  /** Set when the file answers a document request. */
  requestId?: string | null;
  createdAt: string;
  uploadedBy: PublicUser;
}

export type DocumentRequestStatus = 'PENDING' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface DocumentRequestItem {
  id: string;
  caseId: string;
  title: string;
  description: string | null;
  isRequired: boolean;
  dueDate: string | null;
  status: DocumentRequestStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requestedBy: PublicUser;
  reviewedBy: PublicUser | null;
  documents: DocumentItem[];
}

/** GET /document-requests/summary — CLIENT: waiting for them; staff: waiting for review. */
export interface DocumentRequestSummary {
  total: number;
  statuses: DocumentRequestStatus[];
  cases: { caseId: string; caseNumber: string; title: string; count: number }[];
}

export interface MessageItem {
  id: string;
  caseId: string;
  body: string;
  /** When the recipient side read it. */
  readAt: string | null;
  createdAt: string;
  sender: PublicUser;
}

/** GET /cases/:caseId/messages — newest first. */
export interface MessagePage {
  items: MessageItem[];
  nextCursor: string | null;
}

export interface MessageUnreadSummary {
  total: number;
  cases: { caseId: string; caseNumber: string; title: string; count: number }[];
}

/** GET /messages/conversations — one row per case that has messages. */
export interface MessageConversation {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  client: PublicUser;
  lawyer: PublicUser;
  lastMessage: MessageItem | null;
  unreadCount: number;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  amount: string;
  description: string;
  status: 'DRAFT' | 'SENT' | 'AWAITING_CONFIRMATION' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  paidAt: string | null;
  /** The client reported a bank transfer. */
  paymentMarkedAt: string | null;
  paymentNote: string | null;
  /** Last rejected payment report (the invoice went back to SENT). */
  paymentRejectedAt: string | null;
  paymentRejectionReason: string | null;
  confirmedBy: PublicUser | null;
  createdAt: string;
  updatedAt: string;
  case: { id: string; caseNumber: string; title: string };
}

/** GET/PUT /settings/bank-account — `updatedAt` is null while the built-in example account is shown. */
export interface BankAccountSettings {
  bankName: string;
  accountNumber: string;
  accountName: string;
  updatedAt: string | null;
}

/** GET /settings/firm (public), PUT (ADMIN) — `registrationNumber` and `updatedAt` are null until an ADMIN saves the details. */
export interface FirmSettings {
  name: string;
  registrationNumber: string | null;
  phone: string;
  email: string;
  address: string;
  workingHours: string;
  updatedAt: string | null;
}

export type ServiceRequestType = 'LAWYER' | 'CONSULTATION';
type ServiceRequestStatus = 'NEW' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';

/** GET /service-requests, /service-requests/mine, /service-requests/:id — `reviewedBy` is null for clients. */
export interface ServiceRequestItem {
  id: string;
  type: ServiceRequestType;
  caseType: string;
  title: string;
  description: string;
  status: ServiceRequestStatus;
  reviewedAt: string | null;
  rejectionReason: string | null;
  assignedCaseId: string | null;
  createdAt: string;
  updatedAt: string;
  requester: { id: string; firstName: string; lastName: string; email: string; phone: string | null; avatarUrl: string | null };
  reviewedBy: PublicUser | null;
  assignedCase: { id: string; caseNumber: string; title: string; status: CaseListItem['status'] } | null;
}

/** GET /service-requests/summary (ADMIN) */
export interface ServiceRequestSummary {
  new: number;
  accepted: number;
}

/** GET /service-requests/:id/suggested-lawyers (ADMIN) */
export interface SuggestedLawyer {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  title: string | null;
  specializations: string[];
  openCases: number;
  matches: boolean;
}

export interface SuggestedLawyers {
  caseType: string;
  matched: boolean;
  items: SuggestedLawyer[];
}

/** GET /invoices/payment-summary */
export interface InvoicePaymentSummary {
  total: number;
  invoices: { id: string; invoiceNumber: string; amount: string; caseId: string; caseNumber: string; paymentMarkedAt: string | null }[];
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  /** Who caused it; null for system or public events. */
  actor?: PublicUser | null;
}

/** GET /testimonials — the public shape; nothing here identifies the client beyond the name they agreed to show. */
export interface PublicTestimonial {
  id: string;
  authorName: string;
  authorTitle: string | null;
  body: string;
  rating: number | null;
  caseType: string | null;
  publishedAt: string | null;
}

/** GET /testimonials/mine (CLIENT) — the author's own row with its current status. */
export interface MyTestimonial extends PublicTestimonial {
  status: 'PENDING' | 'PUBLISHED' | 'REJECTED';
  consentGiven: boolean;
  createdAt: string;
  case: { id: string; caseNumber: string; title: string } | null;
}

/** GET /admin/testimonials (ADMIN, LAWYER) */
export interface AdminTestimonial extends PublicTestimonial {
  status: 'PENDING' | 'PUBLISHED' | 'REJECTED';
  source: 'PORTAL' | 'MANUAL';
  consentGiven: boolean;
  consentedAt: string | null;
  consentNote: string | null;
  displayOrder: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  authorUserId: string | null;
  authorUser: { id: string; firstName: string; lastName: string; email: string } | null;
  case: { id: string; caseNumber: string; title: string; type: string } | null;
  approvedBy: { id: string; firstName: string; lastName: string } | null;
}
