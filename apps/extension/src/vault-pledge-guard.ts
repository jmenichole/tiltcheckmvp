/** DOM guard for vault withdraw controls during active pledge. */

import { isPledgeActive } from '@tiltcheck/shared';
import { getActivePledgeForSite, type VaultRuleSnapshot } from './vault-sync.js';
import {
  dismissVaultPledgeOverlay,
  isVaultPledgeOverlayActive,
  showVaultPledgeOverlay,
} from './vault-pledge-overlay.js';

export const VAULT_WITHDRAW_SELECTORS = {
  stake_us: [
    'button[data-testid="vault-withdraw"]',
    'button[aria-label*="Withdraw" i]',
  ],
  nuts: ['button[aria-label*="withdraw" i]', '[data-test*="vault"] button'],
} as const;

const VAULT_CONTAINER_RE = /vault/i;

function isVaultRelated(el: Element): boolean {
  let node: Element | null = el;
  while (node) {
    const testId = node.getAttribute('data-testid') ?? '';
    const dataTest = node.getAttribute('data-test') ?? '';
    const className = typeof node.className === 'string' ? node.className : '';
    if (
      VAULT_CONTAINER_RE.test(testId) ||
      VAULT_CONTAINER_RE.test(dataTest) ||
      VAULT_CONTAINER_RE.test(className)
    ) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

function elementText(el: Element): string {
  return (el.textContent ?? '').trim();
}

export function matchesWithdrawTarget(el: Element, site: 'stake_us' | 'nuts'): boolean {
  const selectors = VAULT_WITHDRAW_SELECTORS[site];
  for (const sel of selectors) {
    try {
      if (el.matches(sel) || el.closest(sel)) return true;
    } catch {
      /* invalid selector in older browsers */
    }
  }

  let node: Element | null = el;
  while (node) {
    const tag = node.tagName.toLowerCase();
    if (tag === 'button' || tag === 'a' || node.getAttribute('role') === 'button') {
      if (/withdraw/i.test(elementText(node)) && isVaultRelated(node)) {
        return true;
      }
    }
    node = node.parentElement;
  }
  return false;
}

export function startVaultPledgeGuard(
  getRules: () => VaultRuleSnapshot[],
  getSite: () => 'stake_us' | 'nuts' | null,
): () => void {
  let lastShownReleaseAt: string | null = null;

  const checkPledge = () => {
    const site = getSite();
    if (!site) return;
    const pledge = getActivePledgeForSite(getRules(), site);
    if (!pledge || !isPledgeActive(pledge)) {
      if (isVaultPledgeOverlayActive()) dismissVaultPledgeOverlay();
      lastShownReleaseAt = null;
      return;
    }
    if (isVaultPledgeOverlayActive() && lastShownReleaseAt === pledge.releaseAt) return;
  };

  const onClickCapture = (e: Event) => {
    const site = getSite();
    if (!site) return;
    const pledge = getActivePledgeForSite(getRules(), site);
    if (!pledge || !isPledgeActive(pledge)) return;

    const target = e.target;
    if (!(target instanceof Element)) return;
    if (!matchesWithdrawTarget(target, site)) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    lastShownReleaseAt = pledge.releaseAt;
    showVaultPledgeOverlay(pledge);
  };

  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('pointerdown', onClickCapture, true);

  const observer = new MutationObserver(() => {
    checkPledge();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const poll = window.setInterval(checkPledge, 1000);

  return () => {
    document.removeEventListener('click', onClickCapture, true);
    document.removeEventListener('pointerdown', onClickCapture, true);
    observer.disconnect();
    window.clearInterval(poll);
    dismissVaultPledgeOverlay();
    lastShownReleaseAt = null;
  };
}
