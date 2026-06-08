import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hasSessionCookie, safeRedirectPath } from '@/lib/auth-redirect';

const protectedPrefixes = ['/dashboard', '/settings'];

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const session = request.cookies.get('tc_session');

  if (pathname === '/login' && hasSessionCookie(session?.value)) {
    const target = safeRedirectPath(searchParams.get('redirect'));
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (!protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (!hasSessionCookie(session?.value)) {
    const login = new URL('/login', request.url);
    login.searchParams.set('redirect', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/dashboard/:path*', '/settings'],
};
