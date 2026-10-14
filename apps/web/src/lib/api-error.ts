'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { ApiError } from './api';

type Translate = ReturnType<typeof useTranslations<'errors'>>;

/** `details` only ever carries values a message fills in — numbers and short identifiers. */
const values = (details: unknown): Record<string, string | number> =>
  details && typeof details === 'object' && !Array.isArray(details) ? (details as Record<string, string | number>) : {};

const warned = new Set<string>();

/** In development, say once which code has no wording yet — that is how a gap gets noticed. */
function warnMissing(code: string): void {
  if (process.env.NODE_ENV === 'production' || warned.has(code)) return;
  warned.add(code);
  console.warn(`[i18n] no errors.${code} message — showing the API's Mongolian text. Add it to messages/*.json.`);
}

/**
 * The API answers in Mongolian and names the failure with a stable code. This turns that code into
 * a sentence in the reader's language, and falls back to the API's own wording when the code is one
 * the dictionary has not learned yet — so a new failure is never a blank screen.
 */
export function translateApiError(t: Translate, error: unknown, fallback?: string): string {
  if (!(error instanceof ApiError)) return fallback ?? t('unknown');
  const { code } = error;
  if (!code || !t.has(code)) {
    if (code) warnMissing(code);
    return error.message || fallback || t('unknown');
  }
  const message = t(code, values(error.details));
  // next-intl returns the key path when a message needs a value the server did not send.
  return message === `errors.${code}` ? error.message || fallback || t('unknown') : message;
}

/** The hook form, for the portal and the public site; the admin panel keeps the Mongolian message. */
export function useApiError(): (error: unknown, fallback?: string) => string {
  const t = useTranslations('errors');
  return useCallback((error: unknown, fallback?: string) => translateApiError(t, error, fallback), [t]);
}
