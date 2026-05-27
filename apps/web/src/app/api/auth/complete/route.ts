import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const redirect = url.searchParams.get('redirect') ?? '/dashboard';

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_token', request.url));
  }

  const store = await cookies();
  store.set('tc_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.redirect(new URL(redirect, request.url));
}
