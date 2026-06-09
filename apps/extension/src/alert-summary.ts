import type { ExclusionSuggestion } from '@tiltcheck/shared';
import type { GameMatchStatus } from './game-exclusion-watcher.js';
import type { TiltIndicator } from './tilt-detector.js';
import type { RiskProfile } from './tilt-detector.js';
import type { TiltWarningState } from './tilt-warnings.js';
import { formatTiltEducation } from './tilt-education.js';

export type AlertSummaryInput = {
  gameMatch: { status: GameMatchStatus; label?: string; countdownSec?: number };
  tiltWarning: TiltWarningState;
  liveStats: { clicksIn5s: number; latestIndicator: TiltIndicator | null };
  riskProfile: RiskProfile;
};

export function formatAlertSummary(input: AlertSummaryInput): string {
  const { gameMatch, tiltWarning, liveStats, riskProfile } = input;
  if (gameMatch.status === 'warn') {
    return `${gameMatch.label} · ${gameMatch.countdownSec ?? '?'}s to lock`;
  }
  if (gameMatch.status === 'demo-banner') {
    return `Demo mode — would block ${gameMatch.label ?? 'this game'}`;
  }
  if (gameMatch.status === 'blocked') {
    return `Locked · ${gameMatch.label ?? 'game'}`;
  }
  if (tiltWarning.activeIndicator && tiltWarning.stage > 0) {
    const edu = formatTiltEducation(tiltWarning.activeIndicator, riskProfile);
    const label = tiltWarning.stage >= 2 ? 'Last call' : 'Pulse check';
    return `${label} · ${edu.patternLabel} · ${edu.metricLine}`;
  }
  const ind = liveStats.latestIndicator;
  if (ind && (ind.severity === 'high' || ind.severity === 'critical')) {
    return `Rapid clicks — ${liveStats.clicksIn5s} in 5s`;
  }
  return 'All clear';
}

export type TcLiveState = {
  alertSummary: string;
  clicksIn5s: number;
  gameMatchStatus: GameMatchStatus;
  gameMatchLabel?: string;
  tiltStage: 0 | 1 | 2;
  tiltSuggestion: ExclusionSuggestion | null;
  saveStatus: string;
  autoVaultSite: string | null;
  updatedAt: number;
};

export function publishLiveState(state: TcLiveState): void {
  if (typeof chrome === 'undefined' || !chrome.storage?.session) return;
  void chrome.storage.session.set({ tc_live: state });
  const needsBadge =
    state.gameMatchStatus === 'warn' ||
    state.tiltStage >= 2 ||
    state.alertSummary.includes('Rapid clicks') ||
    state.alertSummary.includes('heating up') ||
    state.alertSummary.startsWith('Last call');
  void chrome.runtime.sendMessage({
    type: 'tc-badge',
    show: needsBadge,
  });
}
