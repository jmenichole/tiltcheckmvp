import { TiltDetector, type RiskProfile } from './tilt-detector.js';
import { triggerTouchGrassTimeout } from './enforcement.js';
import {
  TiltCheckSidebar,
  loadInitialPanelState,
  type PanelState,
} from './sidebar.js';
import { sessionCapDurationMs, getSessionCapConfig, pushSessionCapMinutes, type VaultRuleSnapshot } from './vault-sync.js';
import { GameExclusionWatcher } from './game-exclusion-watcher.js';
import type { GameExclusionEntry } from '@tiltcheck/shared';
import { resolveApiBaseUrl } from './config.js';
import {
  TiltWarningEscalation,
  dismissTiltWarningBanner,
  showTiltWarningBanner,
} from './tilt-warnings.js';
import {
  getAutoVaultSiteName,
  setAutoVaultSidebarMount,
  startAutoVaultIfSupported,
} from './autovault/bootstrap.js';
import { formatGameBlockEducation, formatTiltEducation } from './tilt-education.js';
import { dismissPageToast, showPageToast } from './page-toast.js';
import type { TouchGrassOptions } from './enforcement.js';

const GAME_WARN_TOAST_ID = 'tiltcheck-game-warn-root';

const hostname = window.location.hostname.toLowerCase();
const autoVaultSiteName = getAutoVaultSiteName();
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
  let panelAlwaysOn = false;
  let panelWidth = 220;
  let panelHeight = 300;
  let userCollapsedPanel = false;
  let userManuallyExpandedPanel = false;
  let panelAutoExpandedByWarn = false;
  let saveStatus = '';

  const detector = new TiltDetector(riskProfile);
  const warningEscalation = new TiltWarningEscalation();
  let sidebar: TiltCheckSidebar | null = null;

  function buildTouchGrassOptsForIndicator(
    indicator: ReturnType<TiltDetector['analyze']>[number],
  ): TouchGrassOptions {
    const cap = getSessionCapConfig(vaultRules);
    const education = formatTiltEducation(indicator, riskProfile);
    return {
      triggerReason: education.triggerCard,
      triggerInsight: education.insightLine,
      durationMs: cap.durationMinutes * 60 * 1000,
      durationMinutes: cap.durationMinutes,
      futureMeNote: cap.futureMeNote || undefined,
    };
  }

  function buildTouchGrassOptsForGame(match: GameExclusionEntry): TouchGrassOptions {
    const cap = getSessionCapConfig(vaultRules);
    const education = formatGameBlockEducation(match.label);
    return {
      triggerReason: education.triggerCard,
      triggerInsight: education.insightLine,
      durationMs: cap.durationMinutes * 60 * 1000,
      durationMinutes: cap.durationMinutes,
      futureMeNote: cap.futureMeNote || undefined,
    };
  }

  const gameWatcher = new GameExclusionWatcher({
    onStateChange: (state) => {
      if (state.status === 'warn' && state.matched) {
        showPageToast(GAME_WARN_TOAST_ID, {
          tone: 'heat',
          tag: 'TC · GAME BLOCK',
          headline: `${state.matched.label} is on your no-play list`,
          sub: `Bounce in ${state.countdownSec ?? '?'}s or the tab locks.`,
        });
      } else if (state.status === 'demo-banner' && state.matched) {
        showPageToast(GAME_WARN_TOAST_ID, {
          tone: 'demo',
          tag: 'TC · DEMO',
          headline: `Would block ${state.matched.label}`,
          sub: 'Turn off demo mode to enforce game blocks.',
        });
      } else if (state.status !== 'blocked') {
        dismissPageToast(GAME_WARN_TOAST_ID);
      }

      sidebar?.update({
        gameMatch: {
          status: state.status,
          label: state.matched?.label,
          countdownSec: state.countdownSec,
        },
      });
      if (state.status === 'warn' && !panelExpanded && !userCollapsedPanel) {
        panelExpanded = true;
        panelAutoExpandedByWarn = true;
        sidebar?.update({ expanded: true });
      }
      if (state.status === 'clear') {
        userCollapsedPanel = false;
        if (panelAutoExpandedByWarn && !panelAlwaysOn && !userManuallyExpandedPanel && panelExpanded) {
          panelExpanded = false;
          sidebar?.update({ expanded: false });
        }
        panelAutoExpandedByWarn = false;
      }
    },
    getDemoMode: () => demoMode,
    getLoggedIn: () => loggedIn,
    getBlockDurationMs: () => sessionCapDurationMs(vaultRules),
    buildTouchGrassOpts: buildTouchGrassOptsForGame,
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
    const cap = getSessionCapConfig(vaultRules);
    return {
      loggedIn,
      demoMode,
      username: base.username,
      riskProfile,
      sessionCapArmed: enforcementEnabled,
      sessionCapMinutes: cap.durationMinutes,
      sessionCapLockoutStyle: cap.lockoutStyle,
      gameExclusions,
      gameMatch: base.gameMatch ?? { status: 'clear' },
      liveStats: base.liveStats ?? { clicksIn5s: 0, latestIndicator: null },
      tiltWarning: warningEscalation.getState(),
      saveStatus,
      expanded: panelExpanded,
      alwaysOn: panelAlwaysOn,
      panelWidth: base.panelWidth ?? panelWidth,
      panelHeight: base.panelHeight ?? panelHeight,
      position: base.position ?? { left: 0, top: 0 },
      autoVaultSite: autoVaultSiteName,
    };
  }

  async function getToken(): Promise<string | null> {
    const stored = await chrome.storage.local.get(['tc_session_token']);
    return typeof stored.tc_session_token === 'string' ? stored.tc_session_token : null;
  }

  async function initSidebar() {
    const initial = await loadInitialPanelState();
    panelAlwaysOn = initial.alwaysOn ?? false;
    panelExpanded = initial.expanded ?? false;
    userManuallyExpandedPanel = panelAlwaysOn || panelExpanded;
    panelWidth = initial.panelWidth ?? 220;
    panelHeight = initial.panelHeight ?? 300;
    riskProfile = initial.riskProfile ?? 'moderate';
    gameExclusions = initial.gameExclusions ?? [];
    detector.setProfile(riskProfile);

    sidebar = new TiltCheckSidebar(host, buildPanelState(initial as PanelState), {
      onLogin: () => openDiscordLogin(),
      onSync: () => {
        saveStatus = 'Syncing…';
        sidebar?.update({ saveStatus });
        chrome.runtime
          .sendMessage({ type: 'sync-vault' })
          .then(() => {
            saveStatus = 'Synced.';
            sidebar?.update({ saveStatus });
          })
          .catch(() => {
            saveStatus = 'Sync failed.';
            sidebar?.update({ saveStatus });
          });
      },
      onToggleExpand: () => {
        panelExpanded = !panelExpanded;
        if (panelExpanded) {
          userManuallyExpandedPanel = true;
          userCollapsedPanel = false;
          panelAutoExpandedByWarn = false;
        } else {
          userManuallyExpandedPanel = false;
          userCollapsedPanel = true;
        }
        if (!panelAlwaysOn) {
          chrome.storage.local.set({ tc_panel_expanded: panelExpanded });
        }
        sidebar?.update({ expanded: panelExpanded });
      },
      onToggleAlwaysOn: () => {
        panelAlwaysOn = !panelAlwaysOn;
        if (panelAlwaysOn) {
          panelExpanded = true;
          userManuallyExpandedPanel = true;
          userCollapsedPanel = false;
          panelAutoExpandedByWarn = false;
          chrome.storage.local.set({
            tc_panel_always_on: true,
            tc_panel_expanded: true,
          });
        } else {
          panelExpanded = false;
          userManuallyExpandedPanel = false;
          panelAutoExpandedByWarn = false;
          userCollapsedPanel = false;
          chrome.storage.local.set({
            tc_panel_always_on: false,
            tc_panel_expanded: false,
          });
        }
        sidebar?.update({ alwaysOn: panelAlwaysOn, expanded: panelExpanded });
      },
      onLayoutChange: (layout) => {
        const patch: Record<string, unknown> = {};
        if (layout.panelWidth !== undefined) {
          panelWidth = layout.panelWidth;
          patch.tc_panel_width = layout.panelWidth;
        }
        if (layout.panelHeight !== undefined) {
          panelHeight = layout.panelHeight;
          patch.tc_panel_height = layout.panelHeight;
        }
        if (layout.position) patch.tc_panel_position = layout.position;
        if (Object.keys(patch).length > 0) chrome.storage.local.set(patch);
      },
      onAvMountReady: (mount) => {
        setAutoVaultSidebarMount(mount);
      },
      onSaveLockoutMinutes: async (minutes) => {
        const token = await getToken();
        if (!token) {
          saveStatus = 'Connect first.';
          sidebar?.update({ saveStatus });
          return;
        }
        saveStatus = 'Saving…';
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
        saveStatus = 'Saved.';
        sidebar?.update({
          saveStatus,
          sessionCapArmed: enforcementEnabled,
          sessionCapMinutes: minutes,
        });
      },
    });
    if (autoVaultSiteName) startAutoVaultIfSupported();
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
        const cap = getSessionCapConfig(vaultRules);
        const education = formatTiltEducation(indicator, riskProfile);
        showTiltWarningBanner(education, stage, demoMode, cap.durationMinutes);
      }
      return;
    }

    dismissTiltWarningBanner();
    const cap = getSessionCapConfig(vaultRules);
    const durationMs = cap.durationMinutes * 60 * 1000;
    touchGrassCooldownUntil = Date.now() + durationMs + 5000;
    warningEscalation.reset();
    triggerTouchGrassTimeout(buildTouchGrassOptsForIndicator(indicator));
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
