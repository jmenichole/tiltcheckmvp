import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const apiBase = () => (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

/** Lets the extension copy the web login session into chrome.storage (same Discord account).
 *  Returns the session JWT as JSON — any same-origin XSS on the web app can exfiltrate it.
 *  Prefer keeping CSP tight on marketing pages; future: one-time code or chrome.cookies. */
export async function GET() {
  const store = await cookies();
  const token = store.get('tc_session')?.value;
  if (!token) {
    return NextResponse.json({ token: null }, { status: 401 });
  }

  const res = await fetch(`${apiBase()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    return NextResponse.json({ token: null }, { status: 401 });
  }

  const data = (await res.json()) as { user?: { username?: string } | null };
  if (!data.user) {
    return NextResponse.json({ token: null }, { status: 401 });
  }

  return NextResponse.json({
    token,
    username: data.user.username ?? 'discord',
  });
}
