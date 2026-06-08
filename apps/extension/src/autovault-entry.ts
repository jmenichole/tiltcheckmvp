import { detectAutoVaultSite } from './autovault/site.js';
import { AutoVaultHost } from './autovault/host.js';

const site = detectAutoVaultSite();
if (!site) {
  /* Not stake.us or nuts.gg — autovault content script should not run here. */
} else {
  const host = new AutoVaultHost();

  function scheduleStart() {
    if (!document.body) return;
    void host.start();
  }

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

  window.addEventListener('beforeunload', () => host.destroy());
}
