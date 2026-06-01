import { TiltDetector } from './tilt-detector.js';
import { triggerTouchGrassTimeout } from './enforcement.js';
import { loadSidebarState, renderSidebar } from './sidebar.js';
import { sessionCapDurationMs, type VaultRuleSnapshot } from './vault-sync.js';

const hostname = window.location.hostname.toLowerCase();
const excluded =
  hostname.includes('discord.com') ||
  (hostname === 'localhost' && ['3000', '3001'].includes(window.location.port));

if (!excluded) {
  const detector = new TiltDetector();
  const host = document.createElement('div');
  host.id = 'tiltcheck-sidebar-host';
  document.documentElement.appendChild(host);

  let vaultRules: VaultRuleSnapshot[] = [];
  let enforcementEnabled = false;
  let touchGrassCooldownUntil = 0;

  function refreshSidebar() {
    loadSidebarState().then((state) => renderSidebar(host, state));
  }

  refreshSidebar();

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.tc_vault_rules || changes.tc_session_token) {
      chrome.storage.local.get(['tc_vault_rules', 'tc_session_token', 'tc_demo'], (stored) => {
        vaultRules = (stored.tc_vault_rules as VaultRuleSnapshot[]) ?? [];
        enforcementEnabled = Boolean(stored.tc_session_token) && stored.tc_demo === false;
      });
    }
  });

  chrome.storage.local.get(['tc_vault_rules', 'tc_session_token', 'tc_demo'], (stored) => {
    vaultRules = (stored.tc_vault_rules as VaultRuleSnapshot[]) ?? [];
    enforcementEnabled = Boolean(stored.tc_session_token) && stored.tc_demo === false;
  });

  function maybeEnforce(indicators: ReturnType<TiltDetector['analyze']>) {
    if (!enforcementEnabled || Date.now() < touchGrassCooldownUntil) return;
    const critical = indicators.find((i) => i.severity === 'critical');
    if (!critical) return;
    const durationMs = sessionCapDurationMs(vaultRules);
    touchGrassCooldownUntil = Date.now() + durationMs + 5000;
    triggerTouchGrassTimeout(critical.description, durationMs);
    chrome.runtime.sendMessage({ type: 'enforcement-fired', indicator: critical.type }).catch(() => {});
  }

  document.addEventListener(
    'click',
    () => {
      detector.recordClick();
      maybeEnforce(detector.analyze());
    },
    true,
  );

  window.setInterval(() => {
    if (!enforcementEnabled || Date.now() < touchGrassCooldownUntil) return;
    const fast = detector.detectFastClicks();
    if (fast && (fast.severity === 'high' || fast.severity === 'critical')) {
      maybeEnforce([fast]);
    }
  }, 2000);

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'discord-auth-success' && event.data?.token) {
      chrome.storage.local.set({
        tc_session_token: event.data.token,
        tc_username: event.data.username ?? 'discord',
        tc_demo: false,
      });
      chrome.runtime.sendMessage({ type: 'sync-vault' }).catch(() => {});
      refreshSidebar();
    }
  });
}
