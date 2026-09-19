// Browser-side error reporting; loaded before the app's own code.
import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, sharedSentryOptions } from './sentry.shared';

if (SENTRY_DSN) {
  Sentry.init({
    ...sharedSentryOptions,
    // Session replay would record the portal: case titles, documents, messages. Never.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
