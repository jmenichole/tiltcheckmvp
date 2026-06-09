import { TiltDetector, type RiskProfile } from './tilt-detector.js';
import { handleCriticalEnforcement } from './session-enforcement.js';
import { sessionCapDurationMs, getSessionCapConfig, type VaultRuleSnapshot } from './vault-sync.js';
import { GameExclusionWatcher } from './game-exclusion-watcher.js';
import type { GameExclusionEntry } from '@tiltcheck/shared';
import {
  TiltWarningEscalation,
  dismissTiltWarningBanner,
  showTiltWarningBanner,
} from './tilt-warnings.js';
import {
  dismissGameWarnOverlay,
  showGameWarnOverlay,
} from './game-warn-overlay.js';
import {
  maybeShowSessionPactAck,
  isSessionPactAcknowledged,
} from './session-pact-ack.js';
import {
  getAutoVaultSiteName,
  getAutoVaultHost,
  startAutoVaultIfSupported,
} from './autovault/bootstrap.js';
import { formatGameBlockEducation, formatTiltEducation } from './tilt-education.js';
import { dismissPageToast, showPageToast } from './page-toast.js';
import type { TouchGrassOptions } from './enforcement.js';
import { observeTiltPatterns } from './tilt-pattern-learn.js';
import { dismissTiltSuggestionToast, showTiltSuggestionToast } from './tilt-suggestion-toast.js';
import { pushSuggestedGameExclusion } from './settings-sync.js';
import type { ExclusionSuggestion } from '@tiltcheck/shared';
import { formatAlertSummary, publishLiveState } from './alert-summary.js';
import type { GameMatchStatus } from './game-exclusion-watcher.js';
import { installContentBridge } from './content-bridge.js';

const GAME_WARN_TOAST_ID = 'tiltcheck-game-warn-root';
const PACT_ACK_DELAY_MS = 900;
let pactAckTimer: number | null = null;

const hostname = window.location.hostname.toLowerCase();
const autoVaultSiteName = getAutoVaultSiteName();
const excluded =
  hostname.includes('discord.com') ||
  (hostname === 'localhost' && ['3000', '3001'].includes(window.location.port));

if (!excluded) {
  let vaultRules: VaultRuleSnapshot[] = [];
  let gameExclusions: GameExclusionEntry[] = [];
  let riskProfile: RiskProfile = 'moderate';
  let loggedIn = false;
  let demoMode = true;
  let username: string | undefined;
  let enforcementEnabled = false;
  let touchGrassCooldownUntil = 0;
  let saveStatus = '';
  let lastShownSuggestionLabel: string | null = null;
  let activeTiltSuggestion: ExclusionSuggestion | null = null;
  let gameMatch = {
    status: 'clear' as GameMatchStatus,
    label: undefined as string | undefined,
    countdownSec: undefined as number | undefined,
  };

  const detector = new TiltDetector(riskProfile);
  const warningEscalation = new TiltWarningEscalation();

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
      hubReason: 'tilt',
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
      hubReason: 'game',
    };
  }

  function pushLiveState() {
    const indicators = detector.analyze();
    const latest = indicators.length > 0 ? indicators[indicators.length - 1] : null;
    publishLiveState({
      alertSummary: formatAlertSummary({
        gameMatch: {
          status: gameMatch.status,
          label: gameMatch.label,
          countdownSec: gameMatch.countdownSec,
        },
        tiltWarning: warningEscalation.getState(),
        liveStats: { clicksIn5s: detector.getClicksIn5s(), latestIndicator: latest },
        riskProfile,
      }),
      clicksIn5s: detector.getClicksIn5s(),
      gameMatchStatus: gameMatch.status,
      gameMatchLabel: gameMatch.label,
      tiltStage: warningEscalation.getState().stage,
      tiltSuggestion: activeTiltSuggestion,
      saveStatus,
      autoVaultSite: autoVaultSiteName,
      updatedAt: Date.now(),
    });
  }

  const gameWatcher = new GameExclusionWatcher({
    onStateChange: (state) => {
      if (state.status === 'warn' && state.matched) {
        showGameWarnOverlay(state.matched.label, state.countdownSec ?? 10);
      } else if (state.status === 'demo-banner' && state.matched) {
        dismissGameWarnOverlay();
        showPageToast(GAME_WARN_TOAST_ID, {
          tone: 'demo',
          tag: 'TC · DEMO',
          headline: `Would block ${state.matched.label}`,
          sub: 'Turn off demo mode to enforce game blocks.',
        });
      } else {
        dismissGameWarnOverlay();
        if (state.status !== 'blocked') {
          dismissPageToast(GAME_WARN_TOAST_ID);
        }
      }

      gameMatch = {
        status: state.status,
        label: state.matched?.label,
        countdownSec: state.countdownSec,
      };
      pushLiveState();
    },
    getDemoMode: () => demoMode,
    getLoggedIn: () => loggedIn,
    getBlockDurationMs: () => sessionCapDurationMs(vaultRules),
    buildTouchGrassOpts: buildTouchGrassOptsForGame,
    onCriticalEnforce: (opts) =>
      handleCriticalEnforcement(getSessionCapConfig(vaultRules), opts, { forceTouchGrass: true }),
  });

  async function getToken(): Promise<string | null> {
    const stored = await chrome.storage.local.get(['tc_session_token']);
    return typeof stored.tc_session_token === 'string' ? stored.tc_session_token : null;
  }

  function scheduleSessionPactAck() {
    if (pactAckTimer !== null) {
      window.clearTimeout(pactAckTimer);
      pactAckTimer = null;
    }
    if (isSessionPactAcknowledged() || !loggedIn) return;

    pactAckTimer = window.setTimeout(() => {
      pactAckTimer = null;
      if (isSessionPactAcknowledged()) return;
      const cap = getSessionCapConfig(vaultRules);
      const capArmed =
        loggedIn && !demoMode && vaultRules.some((r) => r.ruleType === 'session_cap' && r.enabled);
      maybeShowSessionPactAck({
        loggedIn,
        demoMode,
        username,
        riskProfile,
        cap,
        capArmed,
        gameExclusions,
      });
    }, PACT_ACK_DELAY_MS);
  }

  function applyStoredState(stored: Record<string, unknown>) {
    vaultRules = (stored.tc_vault_rules as VaultRuleSnapshot[]) ?? [];
    gameExclusions = (stored.tc_game_exclusions as GameExclusionEntry[]) ?? [];
    loggedIn = Boolean(stored.tc_session_token);
    demoMode = !loggedIn || stored.tc_demo !== false;
    username = typeof stored.tc_username === 'string' ? stored.tc_username : undefined;
    riskProfile = (stored.tc_risk_profile as RiskProfile) ?? 'moderate';
    detector.setProfile(riskProfile);
    enforcementEnabled =
      loggedIn && !demoMode && vaultRules.some((r) => r.ruleType === 'session_cap' && r.enabled);

    gameWatcher.setExclusions(gameExclusions);
    pushLiveState();
    scheduleSessionPactAck();
  }

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
      'tc_username',
    ],
    (stored) => {
      applyStoredState(stored);
      if (stored.tc_session_token) {
        chrome.runtime.sendMessage({ type: 'sync-vault' }).catch(() => {});
      }
    },
  );

  gameWatcher.start();
  if (autoVaultSiteName) startAutoVaultIfSupported();
  installContentBridge(getAutoVaultHost);

  async function maybeSuggestGameBlock(indicators: ReturnType<TiltDetector['analyze']>) {
    if (!loggedIn) return;
    const suggestion = await observeTiltPatterns(indicators, gameExclusions);
    if (!suggestion) {
      if (activeTiltSuggestion) {
        activeTiltSuggestion = null;
        pushLiveState();
      }
      return;
    }
    activeTiltSuggestion = suggestion;
    pushLiveState();
    if (suggestion.label === lastShownSuggestionLabel) return;
    lastShownSuggestionLabel = suggestion.label;
    showTiltSuggestionToast(suggestion, {
      onAddAsWarn: async (label) => {
        const token = await getToken();
        if (!token) {
          saveStatus = 'Connect first.';
          pushLiveState();
          return;
        }
        saveStatus = 'Adding block…';
        pushLiveState();
        const result = await pushSuggestedGameExclusion(token, label, 'warn');
        if (!result.ok) {
          saveStatus = result.error;
          pushLiveState();
          return;
        }
        gameExclusions = result.gameExclusions;
        gameWatcher.setExclusions(gameExclusions);
        activeTiltSuggestion = null;
        lastShownSuggestionLabel = null;
        dismissTiltSuggestionToast();
        saveStatus = `Added ${label} (warn).`;
        pushLiveState();
      },
    });
  }

  function handleTiltIndicators(indicators: ReturnType<TiltDetector['analyze']>) {
    void maybeSuggestGameBlock(indicators);

    if (!enforcementEnabled) {
      warningEscalation.reset();
      dismissTiltWarningBanner();
      pushLiveState();
      return;
    }

    if (Date.now() < touchGrassCooldownUntil) return;

    const { action, indicator } = warningEscalation.evaluate(indicators, riskProfile, demoMode);
    pushLiveState();

    if (action === 'none' || !indicator) {
      dismissTiltWarningBanner();
      return;
    }

    if (action === 'warn') {
      const stage = warningEscalation.getState().stage;
      if (stage === 1 || stage === 2) {
        const cap = getSessionCapConfig(vaultRules);
        const education = formatTiltEducation(indicator, riskProfile);
        showTiltWarningBanner(education, stage, demoMode, cap.durationMinutes, () => {
          if (stage === 1) warningEscalation.acknowledgeStageOne();
        });
      }
      return;
    }

    dismissTiltWarningBanner();
    const cap = getSessionCapConfig(vaultRules);
    const durationMs = cap.durationMinutes * 60 * 1000;
    touchGrassCooldownUntil = Date.now() + durationMs + 5000;
    warningEscalation.reset();
    handleCriticalEnforcement(
      getSessionCapConfig(vaultRules),
      buildTouchGrassOptsForIndicator(indicator),
    );
    chrome.runtime.sendMessage({ type: 'enforcement-fired', indicator: indicator.type }).catch(() => {});
    pushLiveState();
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
