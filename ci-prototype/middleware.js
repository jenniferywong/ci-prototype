import { NextResponse } from 'next/server';

const COOKIE_NAME = 'site_auth';
const LOGIN_PATH  = '/login';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip login page and all API routes to avoid redirect loops
  if (pathname.startsWith(LOGIN_PATH) || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const auth = request.cookies.get(COOKIE_NAME)?.value;
  if (auth === 'true') return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = LOGIN_PATH;
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/).*)'],
};
