import { fetchVaultRules } from './vault-sync.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ tc_demo: true });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'sync-vault') {
    chrome.storage.local.get(['tc_session_token'], async (stored) => {
      const token = (stored.tc_session_token as string) ?? null;
      const rules = await fetchVaultRules(token);
      await chrome.storage.local.set({ tc_vault_rules: rules, tc_demo: !token });
      sendResponse({ ok: true, count: rules.length });
    });
    return true;
  }
  if (message?.type === 'enforcement-fired') {
    console.info('[TiltCheck] Enforcement fired:', message.indicator);
    sendResponse({ ok: true });
  }
  return false;
});
