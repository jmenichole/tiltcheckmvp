/** Baked in at build time; override with EXTENSION_API_URL for local API dev. */
export const DEFAULT_API_URL = 'https://tiltcheck-api-production.up.railway.app';
export const DEFAULT_WEB_URL = 'https://tiltcheckmvp-production.up.railway.app';

export function apiBaseUrl(): string {
  const baked =
    (typeof process !== 'undefined' && process.env?.EXTENSION_API_URL) || DEFAULT_API_URL;
  return baked.replace(/\/$/, '');
}

export function webBaseUrl(): string {
  const baked =
    (typeof process !== 'undefined' && process.env?.EXTENSION_WEB_URL) || DEFAULT_WEB_URL;
  return baked.replace(/\/$/, '');
}

/** Runtime override stored from extension options / devtools (optional). */
export async function resolveApiBaseUrl(): Promise<string> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const stored = await chrome.storage.local.get(['tc_api_base']);
    const override = stored.tc_api_base as string | undefined;
    if (override?.startsWith('http')) {
      return override.replace(/\/$/, '');
    }
  }
  return apiBaseUrl();
}
