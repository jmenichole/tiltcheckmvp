import { resolveApiBaseUrl, webBaseUrl } from './config.js';
import { clearExtensionSession } from './session-clear.js';

export type DiscordAuthPayload = {
  type: 'discord-auth-success';
  token: string;
  username?: string;
};

export function isDiscordAuthPayload(data: unknown): data is DiscordAuthPayload {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as DiscordAuthPayload).type === 'discord-auth-success' &&
    typeof (data as DiscordAuthPayload).token === 'string' &&
    (data as DiscordAuthPayload).token.length > 0
  );
}

export async function trustedApiOriginAsync(origin: string): Promise<boolean> {
  try {
    const base = await resolveApiBaseUrl();
    return origin === new URL(base).origin;
  } catch {
    return false;
  }
}

export async function saveDiscordAuth(token: string, username: string): Promise<void> {
  await chrome.storage.local.set({
    tc_session_token: token,
    tc_username: username,
    tc_demo: false,
  });
  chrome.runtime.sendMessage({ type: 'sync-vault' }).catch(() => {});
}

async function validateSessionToken(token: string): Promise<string | null> {
  try {
    const apiBase = await resolveApiBaseUrl();
    const res = await fetch(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: { username?: string } | null };
    return data.user ? (data.user.username ?? 'discord') : null;
  } catch {
    return null;
  }
}

/** Read tc_session from the TiltCheck web domain (works without extension-handoff route). */
export async function syncAuthFromWebCookie(): Promise<boolean> {
  if (typeof chrome.cookies?.get !== 'function') return false;

  const base = webBaseUrl().replace(/\/$/, '');
  let cookie: chrome.cookies.Cookie | null;
  try {
    cookie = await chrome.cookies.get({ url: `${base}/`, name: 'tc_session' });
  } catch {
    return false;
  }
  if (!cookie?.value) return false;

  const stored = await chrome.storage.local.get(['tc_session_token']);
  if (stored.tc_session_token === cookie.value) return true;

  const username = await validateSessionToken(cookie.value);
  if (!username) return false;

  await saveDiscordAuth(cookie.value, username);
  return true;
}

/** OAuth callback page only: API origin + same-window postMessage. */
export function registerDiscordAuthListener(): void {
  window.addEventListener('message', (event) => {
    if (!isDiscordAuthPayload(event.data)) return;
    if (event.source !== window) return;
    void (async () => {
      const onCallback = location.pathname.includes('/auth/discord/callback');
      if (!onCallback && !(await trustedApiOriginAsync(event.origin))) return;
      await saveDiscordAuth(event.data.token, event.data.username ?? 'discord');
    })();
  });
}

function isTiltCheckWebHost(): boolean {
  try {
    const webHost = new URL(webBaseUrl()).hostname;
    return location.hostname === webHost || location.hostname.endsWith('tiltcheck.me');
  } catch {
    return false;
  }
}

function handoffUrl(): string {
  return `${webBaseUrl().replace(/\/$/, '')}/api/auth/extension-handoff`;
}

/** Copy web session cookie into extension storage when on a TiltCheck web page. */
export async function syncAuthFromWebSession(): Promise<boolean> {
  if (!isTiltCheckWebHost()) return false;
  try {
    const res = await fetch(handoffUrl(), { credentials: 'include' });
    if (res.status === 401) return false;
    if (!res.ok) {
      // Handoff route missing or misconfigured — background cookie sync is the fallback.
      chrome.runtime.sendMessage({ type: 'sync-web-auth' }).catch(() => {});
      return false;
    }
    const data = (await res.json()) as { token?: string; username?: string };
    if (!data.token) return false;

    const stored = await chrome.storage.local.get(['tc_session_token']);
    if (stored.tc_session_token === data.token) return true;

    await saveDiscordAuth(data.token, data.username ?? 'discord');
    return true;
  } catch {
    chrome.runtime.sendMessage({ type: 'sync-web-auth' }).catch(() => {});
    return false;
  }
}

export function isTiltCheckWebHostname(hostname: string): boolean {
  try {
    const webHost = new URL(webBaseUrl()).hostname;
    return hostname === webHost || hostname.endsWith('tiltcheck.me');
  } catch {
    return false;
  }
}

function cookieDomainMatchesWeb(hostname: string): boolean {
  const webHost = new URL(webBaseUrl()).hostname;
  const bare = webHost.replace(/^www\./, '');
  const hostBare = hostname.replace(/^www\./, '');
  return hostBare === bare || hostname.endsWith('tiltcheck.me');
}

/** Sync from web session cookie, then ask open TiltCheck tabs to run handoff. */
export async function syncAuthFromWebTabs(): Promise<boolean> {
  if (await syncAuthFromWebCookie()) return true;

  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id == null || !tab.url) continue;
    let hostname: string;
    try {
      hostname = new URL(tab.url).hostname;
    } catch {
      continue;
    }
    if (!isTiltCheckWebHostname(hostname)) continue;
    try {
      const res = (await chrome.tabs.sendMessage(tab.id, { type: 'tc-sync-web-auth' })) as
        | { ok?: boolean }
        | undefined;
      if (res?.ok) return true;
    } catch {
      /* content script not injected on this tab yet */
    }
  }
  return false;
}

export function registerWebCookieChangeListener(): void {
  if (typeof chrome.cookies?.onChanged?.addListener !== 'function') return;
  chrome.cookies.onChanged.addListener((changeInfo) => {
    if (changeInfo.cookie.name !== 'tc_session') return;
    if (!cookieDomainMatchesWeb(changeInfo.cookie.domain.replace(/^\./, ''))) return;
    if (changeInfo.removed) return;
    void syncAuthFromWebCookie();
  });
}

export function registerWebAuthRuntimeListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'tc-sync-web-auth') return false;
    void syncAuthFromWebSession().then((ok) => sendResponse({ ok }));
    return true;
  });
}

export function registerWebLogoutListener(): void {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type === 'tc-web-logout') {
      chrome.runtime.sendMessage({ type: 'tc-logout' }).catch(() => {});
    }
  });
}

export function bootstrapWebAuthSync(): void {
  registerDiscordAuthListener();
  registerWebAuthRuntimeListener();
  registerWebLogoutListener();
  if (isTiltCheckWebHost()) {
    void syncAuthFromWebSession();
    chrome.runtime.sendMessage({ type: 'sync-web-auth' }).catch(() => {});
  }
}
