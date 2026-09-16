import type { CookieOptions } from 'express';
import type { ConfigService } from '@nestjs/config';
import { durationToMs, type Env } from '../config/env';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
/**
 * Non-sensitive marker cookie (no token inside) that lives as long as the refresh token.
 * The web app's middleware uses it to know a session probably exists even after the
 * short-lived access cookie expired, and lets the client-side refresh flow run.
 */
export const SESSION_HINT_COOKIE = 'lf_session';
/**
 * Refresh cookie is only ever sent to the API's /auth/* endpoints. Behind the web app's
 * same-origin proxy the browser sees them under COOKIE_PATH_PREFIX (e.g. /api/auth).
 */
function refreshCookiePath(config: ConfigService<Env, true>): string {
  return `${config.get('COOKIE_PATH_PREFIX', { infer: true })}/auth`;
}

function baseCookieOptions(config: ConfigService<Env, true>): CookieOptions {
  const isProd = config.get('NODE_ENV', { infer: true }) === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    domain: config.get('COOKIE_DOMAIN', { infer: true }),
  };
}

export function accessCookieOptions(config: ConfigService<Env, true>): CookieOptions {
  return {
    ...baseCookieOptions(config),
    path: '/',
    maxAge: durationToMs(config.get('JWT_ACCESS_TTL', { infer: true })),
  };
}

export function refreshCookieOptions(config: ConfigService<Env, true>, expiresAt?: Date): CookieOptions {
  const days = config.get('JWT_REFRESH_TTL_DAYS', { infer: true });
  return {
    ...baseCookieOptions(config),
    path: refreshCookiePath(config),
    maxAge: expiresAt ? Math.max(0, expiresAt.getTime() - Date.now()) : days * 86_400_000,
  };
}

export function sessionHintCookieOptions(config: ConfigService<Env, true>, expiresAt?: Date): CookieOptions {
  return {
    ...refreshCookieOptions(config, expiresAt),
    path: '/',
  };
}
