import { NextResponse, type NextRequest } from 'next/server';

const LOGIN_PATH = '/portal/login';
const PUBLIC_PORTAL_PATHS = ['/portal/login', '/portal/register', '/portal/forgot-password'];
const STAFF_ROLES = new Set(['ADMIN', 'LAWYER']);

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

/**
 * /portal/* and /admin/* need a session (`access_token`, or the long-lived `lf_session`
 * marker so an expired access token can still refresh on the client).
 * /admin/* is for ADMIN and LAWYER only: a CLIENT is redirected to /portal.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has('access_token') || request.cookies.has('lf_session');
  const role = roleFromAccessToken(request.cookies.get('access_token')?.value);
  const isStaff = role !== null && STAFF_ROLES.has(role);

  if (PUBLIC_PORTAL_PATHS.some((p) => pathname.startsWith(p))) {
    if (hasSession) {
      return NextResponse.redirect(new URL(isStaff ? '/admin' : '/portal', request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin') && role === 'CLIENT') {
    return NextResponse.redirect(new URL('/portal', request.url));
  }

  // Staff have no client dashboard; send them to the admin panel.
  if (pathname === '/portal' && isStaff) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/portal/:path*', '/admin/:path*'],
};
