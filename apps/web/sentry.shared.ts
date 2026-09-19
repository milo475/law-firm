/**
 * Settings both the browser and the server side of the web app use. Without a DSN nothing is
 * initialised — local development and the e2e runs never talk to Sentry.
 *
 * The same rule as the API: Sentry sees the shape of a failure, never who it happened to. Every
 * event goes through `scrubEvent`, which drops cookies, auth headers, request bodies and query
 * strings and masks anything that names a client or a case.
 */
import type { ErrorEvent } from '@sentry/nextjs';
import { scrubEvent } from '@law-firm/shared/utils';

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ?? '';

export const sharedSentryOptions = {
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.NEXT_PUBLIC_COMMIT_SHA || undefined,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: (event: ErrorEvent) => scrubEvent(event),
};
