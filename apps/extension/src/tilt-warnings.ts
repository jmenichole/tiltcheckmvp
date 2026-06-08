import type { TiltIndicator } from './tilt-detector.js';
import type { RiskProfile } from './tilt-detector.js';
import { dismissPageToast, showPageToast } from './page-toast.js';

const BANNER_ROOT_ID = 'tiltcheck-tilt-warning-root';
const RESET_CLEAR_MS = 30_000;

export type TiltEnforcementAction = 'none' | 'warn' | 'lockout';

export type TiltWarningState = {
  stage: 0 | 1 | 2;
  activeIndicator: TiltIndicator | null;
};

function severityRank(severity: TiltIndicator['severity']): number {
  if (severity === 'critical') return 3;
  if (severity === 'high') return 2;
  if (severity === 'medium') return 1;
  return 0;
}

function highestIndicator(indicators: TiltIndicator[]): TiltIndicator | null {
  if (indicators.length === 0) return null;
  return indicators.reduce((best, cur) =>
    severityRank(cur.severity) > severityRank(best.severity) ? cur : best,
  );
}

function minWarnRank(profile: RiskProfile): number {
  if (profile === 'degen') return 2;
  return 1;
}

function friendlyHeadline(indicator: TiltIndicator): string {
  if (indicator.type === 'fast_clicks') return 'Click spam — you are on autopilot.';
  if (indicator.type === 'chasing_losses') return 'Loss streak heating up.';
  return indicator.description;
}

export class TiltWarningEscalation {
  private stage: 0 | 1 | 2 = 0;
  private lastActiveAt = 0;
  private activeIndicator: TiltIndicator | null = null;

  getState(): TiltWarningState {
    return { stage: this.stage, activeIndicator: this.activeIndicator };
  }

  reset() {
    this.stage = 0;
    this.activeIndicator = null;
    this.lastActiveAt = 0;
    dismissTiltWarningBanner();
  }

  evaluate(
    indicators: TiltIndicator[],
    profile: RiskProfile,
    demoMode: boolean,
  ): { action: TiltEnforcementAction; indicator: TiltIndicator | null } {
    const top = highestIndicator(indicators);
    const now = Date.now();

    if (!top || severityRank(top.severity) < minWarnRank(profile)) {
      if (this.lastActiveAt && now - this.lastActiveAt > RESET_CLEAR_MS) {
        this.reset();
      }
      return { action: 'none', indicator: null };
    }

    this.lastActiveAt = now;
    this.activeIndicator = top;
    const rank = severityRank(top.severity);

    if (rank >= 3) {
      if (demoMode) {
        this.stage = 2;
        return { action: 'warn', indicator: top };
      }
      return { action: 'lockout', indicator: top };
    }

    if (rank >= 2) {
      this.stage = 2;
      return { action: 'warn', indicator: top };
    }

    this.stage = 1;
    return { action: 'warn', indicator: top };
  }
}

export function showTiltWarningBanner(indicator: TiltIndicator, stage: 1 | 2, demoMode: boolean): void {
  const isUrgent = stage === 2;
  showPageToast(BANNER_ROOT_ID, {
    tone: isUrgent ? 'heat' : 'pulse',
    tag: isUrgent ? 'TC · LAST CALL' : 'TC · PULSE CHECK',
    headline: friendlyHeadline(indicator),
    sub: isUrgent
      ? demoMode
        ? 'Demo mode — no lockout, but slow down.'
        : 'Next spike locks the tab. Touch Grass incoming.'
      : 'Walk it off before we lock the table.',
  });
}

export function dismissTiltWarningBanner(): void {
  dismissPageToast(BANNER_ROOT_ID);
}
