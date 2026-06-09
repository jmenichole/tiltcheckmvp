import type { TiltIndicator } from './tilt-detector.js';
import type { RiskProfile } from './tilt-detector.js';
import type { TiltEducation } from './tilt-education.js';
import {
  dismissTiltWarningOverlay,
  showTiltWarningOverlay,
} from './tilt-warning-overlay.js';

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

export class TiltWarningEscalation {
  private stage: 0 | 1 | 2 = 0;
  private lastActiveAt = 0;
  private activeIndicator: TiltIndicator | null = null;
  private dismissedUntilClear = false;

  getState(): TiltWarningState {
    return { stage: this.stage, activeIndicator: this.activeIndicator };
  }

  reset() {
    this.stage = 0;
    this.activeIndicator = null;
    this.lastActiveAt = 0;
    this.dismissedUntilClear = false;
    dismissTiltWarningBanner();
  }

  /** User tapped through stage-1 overlay — hide until tilt clears. */
  acknowledgeStageOne() {
    this.dismissedUntilClear = true;
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
      this.dismissedUntilClear = false;
      if (demoMode) {
        this.stage = 2;
        return { action: 'warn', indicator: top };
      }
      return { action: 'lockout', indicator: top };
    }

    if (rank >= 2) {
      this.dismissedUntilClear = false;
      this.stage = 2;
      return { action: 'warn', indicator: top };
    }

    this.stage = 1;
    if (this.dismissedUntilClear) {
      return { action: 'none', indicator: top };
    }
    return { action: 'warn', indicator: top };
  }
}

export function showTiltWarningBanner(
  education: TiltEducation,
  stage: 1 | 2,
  demoMode: boolean,
  sessionCapMinutes?: number,
  onDismiss?: () => void,
): void {
  showTiltWarningOverlay(education, stage, demoMode, sessionCapMinutes, onDismiss);
}

export function dismissTiltWarningBanner(): void {
  dismissTiltWarningOverlay();
}
