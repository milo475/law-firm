// Server- and edge-side error reporting. Next calls register() once per runtime.
import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, sharedSentryOptions } from './sentry.shared';

export async function register() {
  if (!SENTRY_DSN) return;
  Sentry.init(sharedSentryOptions);
}

/** Server component, route handler and middleware errors. */
export const onRequestError = Sentry.captureRequestError;
