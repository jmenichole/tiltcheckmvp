/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 */

const PROD_API_URL = 'https://api.tiltcheck.me';
const STAGING_API_URL = 'https://tiltcheck-api-production.up.railway.app';
const DEV_API_URL = 'http://localhost:3001';

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function isLocalHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

/** Full API origin for browser OAuth navigation (not the /api/backend proxy). */
export function getDiscordLoginApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured && /^https?:\/\//i.test(configured)) {
    if (process.env.NODE_ENV === 'production' || isLocalHttpUrl(configured)) {
      return trimTrailingSlash(configured);
    }
  }
  return process.env.NODE_ENV === 'production' ? STAGING_API_URL : DEV_API_URL;
}

export function getDiscordLoginUrl(redirectPath: string): string {
  const safeRedirect = redirectPath.startsWith('/') ? redirectPath : '/dashboard';
  const loginUrl = new URL('/auth/discord/login', `${getDiscordLoginApiBase()}/`);
  loginUrl.searchParams.set('source', 'web');
  loginUrl.searchParams.set('redirect', safeRedirect);
  return loginUrl.toString();
}
