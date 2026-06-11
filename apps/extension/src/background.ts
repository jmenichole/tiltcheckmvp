import { fetchVaultRules } from './vault-sync.js';
import { syncSettingsToStorage } from './settings-sync.js';
import { clearExtensionSession } from './session-clear.js';
import { syncAuthFromWebTabs } from './extension-auth.js';
import {
  expandWindowForSidePanel,
  registerSidePanelWindowResize,
  restoreWindowAfterSidePanel,
} from './side-panel-window.js';

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({ tc_demo: true });
  }
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
registerSidePanelWindowResize();

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['tc_session_token'], (stored) => {
    const token = stored.tc_session_token;
    if (typeof token === 'string' && token.length > 0) {
      void syncUserConfig(token);
    }
  });
});

async function syncUserConfig(token: string | null) {
  const vaultResult = await fetchVaultRules(token);
  const settings = token ? await syncSettingsToStorage(token) : null;

  if (!token) {
    const patch: Record<string, unknown> = { tc_demo: true };
    if (vaultResult.ok) {
      patch.tc_vault_rules = vaultResult.rules;
    }
    await chrome.storage.local.set(patch);
    return {
      rules: vaultResult.ok ? vaultResult.rules : [],
      settings,
      vaultSynced: vaultResult.ok,
      settingsSynced: false,
    };
  }

  if (vaultResult.ok) {
    await chrome.storage.local.set({ tc_vault_rules: vaultResult.rules });
  }

  return {
    rules: vaultResult.ok ? vaultResult.rules : [],
    settings,
    vaultSynced: vaultResult.ok,
    settingsSynced: Boolean(settings),
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'sync-vault' || message?.type === 'sync-settings') {
    chrome.storage.local.get(['tc_session_token'], async (stored) => {
      const token = (stored.tc_session_token as string) ?? null;
      const result = await syncUserConfig(token);
      sendResponse({
        ok: true,
        count: result.rules.length,
        vaultSynced: result.vaultSynced,
        settingsSynced: result.settingsSynced,
        settings: result.settings
          ? {
              riskProfile: result.settings.riskProfile,
              gameExclusions: result.settings.gameExclusions.length,
            }
          : null,
      });
    });
    return true;
  }
  if (message?.type === 'tc-logout') {
    void (async () => {
      await clearExtensionSession();
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (message?.type === 'sync-web-auth') {
    void (async () => {
      const ok = await syncAuthFromWebTabs();
      sendResponse({ ok });
    })();
    return true;
  }
  if (message?.type === 'enforcement-fired') {
    console.info('[TiltCheck] Enforcement fired:', message.indicator);
    sendResponse({ ok: true });
  }
  if (message?.type === 'tc-badge') {
    const show = Boolean(message.show);
    void chrome.action.setBadgeText({ text: show ? '!' : '' });
    if (show) void chrome.action.setBadgeBackgroundColor({ color: '#ff5c5c' });
    sendResponse({ ok: true });
  }
  if (message?.type === 'sidepanel-width' && typeof message.width === 'number') {
    void (async () => {
      const windowId = message.windowId as number | undefined;
      if (windowId != null) {
        await expandWindowForSidePanel(windowId, message.width as number);
      }
    })();
    sendResponse({ ok: true });
    return true;
  }
  if (message?.type === 'sidepanel-closed') {
    void (async () => {
      const windowId = message.windowId as number | undefined;
      if (windowId != null) {
        await restoreWindowAfterSidePanel(windowId);
      }
    })();
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
