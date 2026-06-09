/** Messages from toolbar popup → active tab content script. */

import type { AutoVaultHost } from './autovault/host.js';

export function installContentBridge(getHost: () => AutoVaultHost | null): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'tc-av-snapshot') {
      const host = getHost();
      void host?.getSnapshot().then((snap) => sendResponse({ ok: true, snap }));
      return true;
    }
    if (message?.type === 'tc-av-set-master') {
      const host = getHost();
      void host?.setMasterRunning(Boolean(message.on)).then(() => sendResponse({ ok: true }));
      return true;
    }
    if (message?.type === 'tc-av-onboard') {
      const host = getHost();
      void host?.completeOnboard().then(() => sendResponse({ ok: true }));
      return true;
    }
    return false;
  });
}
