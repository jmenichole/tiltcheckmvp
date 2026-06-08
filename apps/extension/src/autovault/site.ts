import type { AutoVaultSite } from './types.js';

export function detectAutoVaultSite(hostname = window.location.hostname): AutoVaultSite | null {
  const host = hostname.toLowerCase();
  if (/(^|\.)stake\.us$/i.test(host)) {
    return { mode: 'stake-us', name: 'Stake.us' };
  }
  if (/(^|\.)nuts\.gg$/i.test(host)) {
    return { mode: 'nuts-ws', name: 'nuts.gg' };
  }
  return null;
}

export function watchSiteChange(onChange: (site: AutoVaultSite | null) => void): () => void {
  let lastHost = window.location.hostname;

  const check = () => {
    const host = window.location.hostname;
    if (host === lastHost) return;
    lastHost = host;
    onChange(detectAutoVaultSite(host));
  };

  const interval = window.setInterval(check, 1000);

  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);
  history.pushState = (...args) => {
    origPush(...args);
    check();
  };
  history.replaceState = (...args) => {
    origReplace(...args);
    check();
  };
  window.addEventListener('popstate', check);

  return () => {
    clearInterval(interval);
    history.pushState = origPush;
    history.replaceState = origReplace;
    window.removeEventListener('popstate', check);
  };
}
