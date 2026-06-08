const DEFAULT_AUTHED_REDIRECT = '/dashboard';

export function hasSessionCookie(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function safeRedirectPath(
  redirect: string | null | undefined,
  fallback: string = DEFAULT_AUTHED_REDIRECT,
): string {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return fallback;
  }
  return redirect;
}
