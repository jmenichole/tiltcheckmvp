import { webBaseUrl } from './config.js';

/** Web Discord login — session syncs back via extension-handoff on dashboard. */
export function webLoginUrl(redirect = '/dashboard'): string {
  const safe = redirect.startsWith('/') ? redirect : '/dashboard';
  return `${webBaseUrl()}/login?redirect=${encodeURIComponent(safe)}`;
}

export async function openWebLogin(redirect = '/dashboard'): Promise<void> {
  await chrome.tabs.create({ url: webLoginUrl(redirect) });
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollTimeout: ReturnType<typeof setTimeout> | null = null;

export function stopWebAuthPoll(): void {
  if (pollTimer) clearInterval(pollTimer);
  if (pollTimeout) clearTimeout(pollTimeout);
  pollTimer = null;
  pollTimeout = null;
}

/** Poll handoff until tc_session_token appears (user finished web login). */
export function startWebAuthPoll(onSynced: () => void, maxMs = 120_000): void {
  stopWebAuthPoll();
  const tick = () => {
    chrome.runtime.sendMessage({ type: 'sync-web-auth' }, () => {
      chrome.storage.local.get(['tc_session_token'], (stored) => {
        if (stored.tc_session_token) {
          stopWebAuthPoll();
          onSynced();
        }
      });
    });
  };
  tick();
  pollTimer = setInterval(tick, 2000);
  pollTimeout = setTimeout(stopWebAuthPoll, maxMs);
}
