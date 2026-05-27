import { SignJWT, jwtVerify } from 'jose';
import type { ApiUser } from '@tiltcheck/shared';

const COOKIE_NAME = 'tc_session';
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? 'dev-secret-change-me-32chars-min');

export function sessionCookieName(): string {
  return COOKIE_NAME;
}

export async function signSession(user: ApiUser): Promise<string> {
  return new SignJWT({ sub: user.id, discordId: user.discordId, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

export async function verifySession(token: string): Promise<{ userId: string; discordId: string; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return {
      userId: String(payload.sub),
      discordId: String(payload.discordId ?? ''),
      username: String(payload.username ?? 'User'),
    };
  } catch {
    return null;
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    }),
  );
}
