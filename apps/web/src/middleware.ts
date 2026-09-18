import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { isSpecializationKey, specializationKeyFor } from '@/content/specializations';
import { routing, type Locale } from '@/i18n/routing';

const LOGIN_PATH = '/portal/login';
const PUBLIC_PORTAL_PATHS = ['/portal/login', '/portal/register', '/portal/forgot-password'];
const STAFF_ROLES = new Set(['ADMIN', 'LAWYER']);

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Reads the role claim from the access-token cookie for routing decisions only.
 * The signature is NOT verified here — the API enforces every permission; this just
 * keeps clients out of /admin screens and sends staff to the right home page.
 */
function roleFromAccessToken(token: string | undefined): string | null {
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const claims = JSON.parse(atob(base64)) as { role?: unknown };
    return typeof claims.role === 'string' ? claims.role : null;
  } catch {
    return null;
  }
}

/** Splits `/en/portal/cases` into the locale and the route the session rules are written against. */
function splitLocale(pathname: string): { locale: Locale; prefix: string; route: string } {
  const [, first, ...rest] = pathname.split('/');
  if (routing.locales.includes(first as Locale)) {
    const locale = first as Locale;
    return {
      locale,
      prefix: locale === routing.defaultLocale ? '' : `/${locale}`,
      route: `/${rest.join('/')}`.replace(/\/$/, '') || '/',
    };
  }
  return { locale: routing.defaultLocale, prefix: '', route: pathname };
}

/**
 * /portal/* and /admin/* need a session (`access_token`, or the long-lived `lf_session`
 * marker so an expired access token can still refresh on the client) in every language.
 * /admin/* is for ADMIN and LAWYER only: a CLIENT is redirected to /portal.
 * Everything else only picks the locale; /api/* never reaches this file (see the matcher).
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [, first] = pathname.split('/');
  const hasPrefix = routing.locales.includes(first as Locale);

  // A language the visitor picked themselves (NEXT_LOCALE) is honoured on unprefixed URLs.
  // Accept-Language never redirects — the header only offers the switch (LocaleSuggestion).
  const chosen = request.cookies.get('NEXT_LOCALE')?.value as Locale | undefined;
  if (!hasPrefix && chosen && chosen !== routing.defaultLocale && routing.locales.includes(chosen)) {
    const target = new URL(`/${chosen}${pathname === '/' ? '' : pathname}${search}`, request.url);
    return NextResponse.redirect(target);
  }

  const { prefix, route } = splitLocale(pathname);

  // `/lawyers?spec=Иргэний` was the shape before the filter used keys. Normalising here (rather than in
  // the page) keeps it a real 308 for search engines: a redirect thrown while the page streams would
  // only reach the browser as a 200 with a client-side hop.
  if (route === '/lawyers') {
    const spec = request.nextUrl.searchParams.get('spec');
    if (spec && !isSpecializationKey(spec)) {
      const key = specializationKeyFor(spec);
      if (key) {
        const target = request.nextUrl.clone();
        target.searchParams.set('spec', key);
        return NextResponse.redirect(target, 308);
      }
    }
  }

  const guarded = route === '/portal' || route.startsWith('/portal/') || route === '/admin' || route.startsWith('/admin/');
  if (!guarded) return intlMiddleware(request);

  const hasSession = request.cookies.has('access_token') || request.cookies.has('lf_session');
  const role = roleFromAccessToken(request.cookies.get('access_token')?.value);
  const isStaff = role !== null && STAFF_ROLES.has(role);
  const to = (target: string) => NextResponse.redirect(new URL(`${prefix}${target}`, request.url));

  if (PUBLIC_PORTAL_PATHS.some((p) => route.startsWith(p))) {
    return hasSession ? to(isStaff ? '/admin' : '/portal') : intlMiddleware(request);
  }

  if (!hasSession) {
    const loginUrl = new URL(`${prefix}${LOGIN_PATH}`, request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (route.startsWith('/admin') && role === 'CLIENT') return to('/portal');
  // Staff have no client dashboard; send them to the admin panel.
  if (route === '/portal' && isStaff) return to('/admin');

  return intlMiddleware(request);
}

export const config = {
  // Everything except the API proxy, Next's own assets and files with an extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
