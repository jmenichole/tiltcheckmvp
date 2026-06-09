import { fetchVaultRules } from './vault-sync.js';
import { syncSettingsToStorage } from './settings-sync.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    tc_demo: true,
    tc_panel_expanded: false,
    tc_panel_always_on: false,
  });
});

async function syncUserConfig(token: string | null) {
  const [rules, settings] = await Promise.all([
    fetchVaultRules(token),
    syncSettingsToStorage(token),
  ]);

  const patch: Record<string, unknown> = { tc_vault_rules: rules };
  if (!token) {
    patch.tc_demo = true;
  } else if (!settings) {
    patch.tc_demo = false;
  }
  await chrome.storage.local.set(patch);
  return { rules, settings };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'sync-vault' || message?.type === 'sync-settings') {
    chrome.storage.local.get(['tc_session_token'], async (stored) => {
      const token = (stored.tc_session_token as string) ?? null;
      const { rules, settings } = await syncUserConfig(token);
      sendResponse({
        ok: true,
        count: rules.length,
        settings: settings
          ? {
              riskProfile: settings.riskProfile,
              gameExclusions: settings.gameExclusions.length,
            }
          : null,
      });
    });
    return true;
  }
  if (message?.type === 'enforcement-fired') {
    console.info('[TiltCheck] Enforcement fired:', message.indicator);
    sendResponse({ ok: true });
  }
  return false;
});
