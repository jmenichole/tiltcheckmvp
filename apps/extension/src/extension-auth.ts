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

/** OAuth callback page only: API origin + same-window postMessage. */
export function registerDiscordAuthListener(): void {
  window.addEventListener('message', (event) => {
    if (!isDiscordAuthPayload(event.data)) return;
    void (async () => {
      if (event.source !== window) return;
      if (!(await trustedApiOriginAsync(event.origin))) return;
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
    if (res.status === 401) {
      await clearExtensionSession();
      return false;
    }
    if (!res.ok) return false;
    const data = (await res.json()) as { token?: string; username?: string };
    if (!data.token) return false;

    const stored = await chrome.storage.local.get(['tc_session_token']);
    if (stored.tc_session_token === data.token) return true;

    await saveDiscordAuth(data.token, data.username ?? 'discord');
    return true;
  } catch {
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

/** Ask open TiltCheck web tabs to run handoff sync (panel / background). */
export async function syncAuthFromWebTabs(): Promise<boolean> {
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
  }
}
