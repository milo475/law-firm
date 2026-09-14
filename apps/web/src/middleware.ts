import { NextResponse, type NextRequest } from 'next/server';

const LOGIN_PATH = '/portal/login';

/**
 * Guards /portal/*: without a session cookie the visitor is sent to the login page.
 * `access_token` is the short-lived JWT cookie; `lf_session` is a marker that lives
 * as long as the refresh token, so an expired access token does not bounce a user
 * who can still silently refresh on the client.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has('access_token') || request.cookies.has('lf_session');

  if (pathname.startsWith(LOGIN_PATH)) {
    if (hasSession) {
      return NextResponse.redirect(new URL('/portal', request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/portal/:path*'],
};
