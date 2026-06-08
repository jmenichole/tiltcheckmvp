import { TiltDetector, type RiskProfile } from './tilt-detector.js';
import { triggerTouchGrassTimeout } from './enforcement.js';
import {
  TiltCheckSidebar,
  loadInitialPanelState,
  type PanelState,
} from './sidebar.js';
import { sessionCapDurationMs, pushSessionCapMinutes, type VaultRuleSnapshot } from './vault-sync.js';
import { GameExclusionWatcher } from './game-exclusion-watcher.js';
import type { GameExclusionEntry } from '@tiltcheck/shared';
import { resolveApiBaseUrl } from './config.js';
import {
  TiltWarningEscalation,
  dismissTiltWarningBanner,
  showTiltWarningBanner,
} from './tilt-warnings.js';
import { pushSettingsToApi } from './settings-sync.js';

const hostname = window.location.hostname.toLowerCase();
const excluded =
  hostname.includes('discord.com') ||
  (hostname === 'localhost' && ['3000', '3001'].includes(window.location.port));

if (!excluded) {
  const host = document.createElement('div');
  host.id = 'tiltcheck-sidebar-host';
  document.documentElement.appendChild(host);

  let vaultRules: VaultRuleSnapshot[] = [];
  let gameExclusions: GameExclusionEntry[] = [];
  let riskProfile: RiskProfile = 'moderate';
  let loggedIn = false;
  let demoMode = true;
  let enforcementEnabled = false;
  let touchGrassCooldownUntil = 0;
  let panelExpanded = false;
  let userCollapsedPanel = false;
  let saveStatus = '';

  const detector = new TiltDetector(riskProfile);
  const warningEscalation = new TiltWarningEscalation();
  let sidebar: TiltCheckSidebar | null = null;

  const gameWatcher = new GameExclusionWatcher({
    onStateChange: (state) => {
      sidebar?.update({
        gameMatch: {
          status: state.status,
          label: state.matched?.label,
          countdownSec: state.countdownSec,
        },
      });
      if (state.status === 'warn' && !panelExpanded && !userCollapsedPanel) {
        panelExpanded = true;
        chrome.storage.local.set({ tc_panel_expanded: true });
        sidebar?.update({ expanded: true });
      }
      if (state.status === 'clear') {
        userCollapsedPanel = false;
      }
    },
    getDemoMode: () => demoMode,
    getLoggedIn: () => loggedIn,
    getBlockDurationMs: () => sessionCapDurationMs(vaultRules),
  });

  function updateLiveStats(indicators: ReturnType<TiltDetector['analyze']>) {
    const latest = indicators.length > 0 ? indicators[indicators.length - 1] : null;
    sidebar?.update({
      liveStats: {
        clicksIn5s: detector.getClicksIn5s(),
        latestIndicator: latest,
      },
    });
  }

  function buildPanelState(base: Partial<PanelState>): PanelState {
    const cap = vaultRules.find((r) => r.ruleType === 'session_cap' && r.enabled);
    return {
      loggedIn,
      demoMode,
      username: base.username,
      riskProfile,
      sessionCapArmed: enforcementEnabled,
      sessionCapMinutes: cap?.config?.durationMinutes ?? 5,
      gameExclusions,
      gameMatch: base.gameMatch ?? { status: 'clear' },
      liveStats: base.liveStats ?? { clicksIn5s: 0, latestIndicator: null },
      tiltWarning: warningEscalation.getState(),
      saveStatus,
      expanded: panelExpanded,
      position: base.position ?? { left: 0, top: 0 },
    };
  }

  async function getToken(): Promise<string | null> {
    const stored = await chrome.storage.local.get(['tc_session_token']);
    return typeof stored.tc_session_token === 'string' ? stored.tc_session_token : null;
  }

  async function initSidebar() {
    const initial = await loadInitialPanelState();
    panelExpanded = initial.expanded ?? false;
    riskProfile = initial.riskProfile ?? 'moderate';
    gameExclusions = initial.gameExclusions ?? [];
    detector.setProfile(riskProfile);

    sidebar = new TiltCheckSidebar(host, buildPanelState(initial as PanelState), {
      onLogin: () => openDiscordLogin(),
      onSync: () => {
        chrome.runtime.sendMessage({ type: 'sync-vault' }).catch(() => {});
      },
      onToggleExpand: () => {
        panelExpanded = !panelExpanded;
        if (!panelExpanded) userCollapsedPanel = true;
        chrome.storage.local.set({ tc_panel_expanded: panelExpanded });
        sidebar?.update({ expanded: panelExpanded });
      },
      onPositionChange: (pos) => {
        chrome.storage.local.set({ tc_panel_position: pos });
      },
      onSaveLockoutMinutes: async (minutes) => {
        const token = await getToken();
        if (!token) {
          saveStatus = 'Connect Discord to save lockout time.';
          sidebar?.update({ saveStatus });
          return;
        }
        saveStatus = 'Saving lockout time...';
        sidebar?.update({ saveStatus });
        const result = await pushSessionCapMinutes(token, minutes);
        if (!result.ok) {
          saveStatus = result.error;
          sidebar?.update({ saveStatus });
          return;
        }
        vaultRules = result.rules;
        enforcementEnabled =
          loggedIn && !demoMode && vaultRules.some((r) => r.ruleType === 'session_cap' && r.enabled);
        saveStatus = 'Lockout time saved.';
        sidebar?.update({
          saveStatus,
          sessionCapArmed: enforcementEnabled,
          sessionCapMinutes: minutes,
        });
      },
      onSaveGameExclusions: async (entries) => {
        const token = await getToken();
        if (!token) {
          saveStatus = 'Connect Discord to save game blocks.';
          sidebar?.update({ saveStatus });
          return;
        }
        saveStatus = 'Saving game blocks...';
        sidebar?.update({ saveStatus });
        const result = await pushSettingsToApi(token, { gameExclusions: entries });
        if (!result.ok) {
          saveStatus = result.error;
          sidebar?.update({ saveStatus });
          return;
        }
        gameExclusions = result.settings.gameExclusions;
        gameWatcher.setExclusions(gameExclusions);
        saveStatus = 'Game blocks saved.';
        sidebar?.update({ saveStatus, gameExclusions });
      },
    });
  }

  async function openDiscordLogin() {
    const api = await resolveApiBaseUrl();
    const url = `${api}/auth/discord/login?source=ext`;
    const popup = window.open(url, 'tiltcheck-discord-auth', 'width=520,height=720');
    if (!popup) window.open(url, '_blank');
  }

  function applyStoredState(stored: Record<string, unknown>) {
    vaultRules = (stored.tc_vault_rules as VaultRuleSnapshot[]) ?? [];
    gameExclusions = (stored.tc_game_exclusions as GameExclusionEntry[]) ?? [];
    loggedIn = Boolean(stored.tc_session_token);
    demoMode = !loggedIn || stored.tc_demo !== false;
    riskProfile = (stored.tc_risk_profile as RiskProfile) ?? 'moderate';
    detector.setProfile(riskProfile);
    enforcementEnabled =
      loggedIn && !demoMode && vaultRules.some((r) => r.ruleType === 'session_cap' && r.enabled);

    gameWatcher.setExclusions(gameExclusions);

    const cap = vaultRules.find((r) => r.ruleType === 'session_cap' && r.enabled);
    sidebar?.update({
      loggedIn,
      demoMode,
      username: stored.tc_username as string | undefined,
      riskProfile,
      sessionCapArmed: enforcementEnabled,
      sessionCapMinutes: cap?.config?.durationMinutes ?? 5,
      gameExclusions,
    });
  }

  void initSidebar();

  chrome.storage.onChanged.addListener((changes) => {
    if (
      changes.tc_vault_rules ||
      changes.tc_session_token ||
      changes.tc_demo ||
      changes.tc_username ||
      changes.tc_risk_profile ||
      changes.tc_game_exclusions
    ) {
      chrome.storage.local.get(
        [
          'tc_vault_rules',
          'tc_session_token',
          'tc_demo',
          'tc_username',
          'tc_risk_profile',
          'tc_game_exclusions',
        ],
        (stored) => {
          applyStoredState(stored);
        },
      );
    }
  });

  chrome.storage.local.get(
    [
      'tc_vault_rules',
      'tc_session_token',
      'tc_demo',
      'tc_risk_profile',
      'tc_game_exclusions',
    ],
    (stored) => {
      applyStoredState(stored);
      if (stored.tc_session_token) {
        chrome.runtime.sendMessage({ type: 'sync-vault' }).catch(() => {});
      }
    },
  );

  gameWatcher.start();

  function handleTiltIndicators(indicators: ReturnType<TiltDetector['analyze']>) {
    updateLiveStats(indicators);

    if (!enforcementEnabled) {
      warningEscalation.reset();
      dismissTiltWarningBanner();
      sidebar?.update({ tiltWarning: warningEscalation.getState() });
      return;
    }

    if (Date.now() < touchGrassCooldownUntil) return;

    const { action, indicator } = warningEscalation.evaluate(indicators, riskProfile, demoMode);
    sidebar?.update({ tiltWarning: warningEscalation.getState() });

    if (action === 'none' || !indicator) {
      dismissTiltWarningBanner();
      return;
    }

    if (action === 'warn') {
      const stage = warningEscalation.getState().stage;
      if (stage === 1 || stage === 2) {
        showTiltWarningBanner(indicator, stage, demoMode);
      }
      return;
    }

    dismissTiltWarningBanner();
    const durationMs = sessionCapDurationMs(vaultRules);
    touchGrassCooldownUntil = Date.now() + durationMs + 5000;
    warningEscalation.reset();
    triggerTouchGrassTimeout(indicator.description, durationMs);
    chrome.runtime.sendMessage({ type: 'enforcement-fired', indicator: indicator.type }).catch(() => {});
    sidebar?.update({ tiltWarning: warningEscalation.getState() });
  }

  document.addEventListener(
    'click',
    () => {
      detector.recordClick();
      handleTiltIndicators(detector.analyze());
    },
    true,
  );

  window.setInterval(() => {
    handleTiltIndicators(detector.analyze());
  }, 2000);

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'discord-auth-success' && event.data?.token) {
      chrome.storage.local.set({
        tc_session_token: event.data.token,
        tc_username: event.data.username ?? 'discord',
        tc_demo: false,
      });
      chrome.runtime.sendMessage({ type: 'sync-vault' }).catch(() => {});
    }
  });
}
