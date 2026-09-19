/**
 * Sentry has to be initialised before anything else is imported, so this file is the first import
 * in main.ts. Without SENTRY_DSN it does nothing at all — local development and the test runs never
 * talk to Sentry.
 *
 * What is sent: the stack, the route, the status and the release. What is not: cookies, auth
 * headers, request bodies, query strings, and anything that names a client or a case
 * (see scrubEvent in @law-firm/shared). 4xx responses are not reported at all — they are the user
 * or their browser being wrong, and they would bury the real failures.
 */
import * as Sentry from '@sentry/nestjs';
import { isReportableStatus, scrubEvent } from '@law-firm/shared';

const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.RAILWAY_GIT_COMMIT_SHA || undefined,
    // Enough to see a slow endpoint, not enough to matter on the bill.
    tracesSampleRate: 0.1,
    // Never attach IP addresses, cookies or request bodies automatically.
    sendDefaultPii: false,
    beforeSend(event) {
      const status = Number(event.contexts?.response?.status_code ?? event.tags?.['http.status_code']);
      if (!Number.isNaN(status) && !isReportableStatus(status)) return null;
      return scrubEvent(event);
    },
    beforeBreadcrumb(breadcrumb) {
      // Query strings carry search terms; the path is enough to follow what happened.
      if (typeof breadcrumb.data?.url === 'string') breadcrumb.data.url = breadcrumb.data.url.split('?')[0];
      return breadcrumb;
    },
  });
}

export const sentryEnabled = Boolean(dsn);
