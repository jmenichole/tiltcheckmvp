export function apiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '';
  }
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
}

export async function apiFetch(path: string, init?: RequestInit) {
  const base = typeof window !== 'undefined' ? '/api/backend' : apiBaseUrl();
  return fetch(`${base}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}
