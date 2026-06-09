import { detectAutoVaultSite } from './site.js';
import { AutoVaultHost } from './host.js';

const LOG_PREFIX = '[TiltCheck AutoVault]';

let host: AutoVaultHost | null = null;
let started = false;

export function getAutoVaultSiteName(): string | null {
  return detectAutoVaultSite()?.name ?? null;
}

export function getAutoVaultHost(): AutoVaultHost | null {
  return host;
}

export function startAutoVaultIfSupported(): void {
  if (started) return;
  const site = detectAutoVaultSite();
  if (!site) return;
  started = true;
  host = new AutoVaultHost();

  const scheduleStart = () => {
    if (!document.body) return;
    void host?.start().then(() => {
      console.log(LOG_PREFIX, `Started on ${site.name}`);
    });
  };

  if (document.body) scheduleStart();
  else {
    const obs = new MutationObserver(() => {
      if (document.body) {
        obs.disconnect();
        scheduleStart();
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.addEventListener('beforeunload', () => {
    host?.destroy();
    host = null;
    started = false;
  });
}
