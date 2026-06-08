import type { TiltIndicator } from './tilt-detector.js';
import type { RiskProfile } from './tilt-detector.js';

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
      this.stage = this.stage < 2 ? 2 : 2;
      return { action: 'warn', indicator: top };
    }

    this.stage = this.stage < 1 ? 1 : 1;
    return { action: 'warn', indicator: top };
  }
}

export function showTiltWarningBanner(indicator: TiltIndicator, stage: 1 | 2, demoMode: boolean): void {
  dismissTiltWarningBanner();

  const root = document.createElement('div');
  root.id = BANNER_ROOT_ID;
  const isUrgent = stage === 2;
  const border = isUrgent ? 'rgba(255,74,74,.55)' : 'rgba(245,158,11,.45)';
  const bg = isUrgent ? 'rgba(255,74,74,.14)' : 'rgba(245,158,11,.12)';
  const title = isUrgent ? 'Slow down — lockout next' : 'TiltCheck warning';
  const demoNote = demoMode ? ' · demo mode (no lockout)' : '';

  root.style.cssText = [
    'position:fixed',
    'top:12px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:2147483645',
    'max-width:min(420px,calc(100vw - 24px))',
    'padding:10px 14px',
    'border-radius:8px',
    `border:1px solid ${border}`,
    `background:${bg}`,
    'color:#e6e6e6',
    'font:12px/1.45 system-ui,-apple-system,sans-serif',
    'box-shadow:0 8px 24px rgba(0,0,0,.35)',
    'pointer-events:none',
  ].join(';');

  root.innerHTML = `
    <p style="margin:0 0 4px;font:700 10px/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:${isUrgent ? '#ff4a4a' : '#f59e0b'}">${title}${demoNote}</p>
    <p style="margin:0;font-weight:600">${indicator.description}</p>
    <p style="margin:4px 0 0;font-size:11px;color:#9ca3af">${isUrgent ? 'One more spike triggers Touch Grass lockout.' : 'Take a breath before the table locks.'}</p>
  `;
  document.documentElement.appendChild(root);
}

export function dismissTiltWarningBanner(): void {
  document.getElementById(BANNER_ROOT_ID)?.remove();
}
