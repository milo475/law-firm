/**
 * What may leave the building in an error report.
 *
 * This is a law firm: an exception that carries a client's name, phone number, the text of a case
 * description or the title of a document is a confidentiality problem, not a debugging convenience.
 * Sentry gets the shape of the failure — stack, route, status, release — and nothing that identifies
 * a person or a case. Both apps run every event through `scrubEvent` in `beforeSend`.
 */

const FILTERED = '[Filtered]';

/** Header names never worth keeping; any of them is enough to impersonate the user. */
const SECRET_HEADERS = new Set([
  'cookie',
  'set-cookie',
  'authorization',
  'proxy-authorization',
  'x-api-key',
  'x-auth-token',
  'x-csrf-token',
]);

/**
 * Object keys whose value is masked wherever it appears in the event tree. Credentials plus the
 * fields this app stores client data in (a name, a phone number, the body of a message, the title
 * of a document).
 */
const SECRET_KEYS = [
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'apikey',
  'authorization',
  'cookie',
  'identifier',
  'email',
  'phone',
  'firstname',
  'lastname',
  'authorname',
  'authortitle',
  'fullname',
  'address',
  'register',
  'registrynumber',
  'filename',
  'originalname',
  'storagekey',
  'title',
  'name',
  'body',
  'description',
  'content',
  'note',
  'consentnote',
  'rejectionreason',
  'bio',
];

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
/** Mongolian mobile numbers are eight digits, optionally with +976 in front. */
const PHONE = /(\+?976[\s-]?)?\b\d{8}\b/g;

/** Masks e-mail addresses and phone numbers inside a free-text string. */
export function redactText(value: string): string {
  return value.replace(EMAIL, FILTERED).replace(PHONE, FILTERED);
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Recursively masks secret keys and redacts free text. Depth-limited so a cyclic event cannot hang. */
function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return FILTERED;
  if (typeof value === 'string') return redactText(value);
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));
  if (!isPlainObject(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = SECRET_KEYS.includes(key.toLowerCase()) ? FILTERED : scrubValue(item, depth + 1);
  }
  return out;
}

/** The part of a Sentry event this module touches; kept structural so both SDKs satisfy it. */
export interface ScrubbableEvent {
  request?: {
    cookies?: unknown;
    headers?: Record<string, string> | undefined;
    data?: unknown;
    query_string?: unknown;
    url?: string;
    [key: string]: unknown;
  };
  user?: { id?: string | number; ip_address?: string; email?: string; username?: string; [key: string]: unknown };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  breadcrumbs?: { data?: Record<string, unknown>; message?: string; [key: string]: unknown }[];
  message?: string;
  exception?: { values?: { value?: string; type?: string; [key: string]: unknown }[] };
  [key: string]: unknown;
}

/**
 * Strips everything identifying from an event. Returns the event so it can be used directly as
 * `beforeSend`; it never drops an event on its own (the decision to skip 4xx lives at the call site).
 */
export function scrubEvent<T extends object>(input: T): T {
  // Structural, so an event from either SDK (@sentry/nestjs, @sentry/nextjs) fits without a shared type.
  const event = input as ScrubbableEvent;
  if (event.request) {
    delete event.request.cookies;
    // A request body in this app is client data: case text, a message, a testimonial.
    if (event.request.data !== undefined) event.request.data = FILTERED;
    // A search term in the query string is client data too; the path alone is enough to debug.
    if (event.request.query_string !== undefined) event.request.query_string = FILTERED;
    if (typeof event.request.url === 'string') event.request.url = event.request.url.split('?')[0];
    if (event.request.headers) {
      const headers: Record<string, string> = {};
      for (const [name, value] of Object.entries(event.request.headers)) {
        headers[name] = SECRET_HEADERS.has(name.toLowerCase()) ? FILTERED : redactText(String(value));
      }
      event.request.headers = headers;
    }
  }

  // Which user hit the error is answerable from the id; the rest is personal data.
  if (event.user) event.user = event.user.id === undefined ? {} : { id: event.user.id };

  if (event.extra) event.extra = scrubValue(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = scrubValue(event.contexts) as Record<string, unknown>;
  if (event.tags) event.tags = scrubValue(event.tags) as Record<string, unknown>;
  if (typeof event.message === 'string') event.message = redactText(event.message);

  for (const value of event.exception?.values ?? []) {
    if (typeof value.value === 'string') value.value = redactText(value.value);
  }

  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (typeof breadcrumb.message === 'string') breadcrumb.message = redactText(breadcrumb.message);
    if (breadcrumb.data) breadcrumb.data = scrubValue(breadcrumb.data) as Record<string, unknown>;
  }

  return input;
}

/**
 * Whether a failure is worth reporting. A 4xx is the user or their browser being wrong — a bad
 * password, a missing page, a request for someone else's case — and would bury the real failures.
 */
export function isReportableStatus(status: number | undefined): boolean {
  return status === undefined || status >= 500;
}
