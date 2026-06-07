import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function webOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_WEB_URL ??
    process.env.WEB_URL ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const redirect = url.searchParams.get('redirect') ?? '/dashboard';
  const origin = webOrigin();

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_token', origin));
  }

  const store = await cookies();
  store.set('tc_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  const path = redirect.startsWith('/') ? redirect : '/dashboard';
  return NextResponse.redirect(new URL(path, `${origin}/`));
}
