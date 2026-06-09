import type { RiskProfile } from './tilt-detector.js';
import type { TiltIndicator } from './tilt-detector.js';

export type TiltEducation = {
  patternLabel: string;
  headline: string;
  metricLine: string;
  insightLine: string;
  triggerCard: string;
};

const PROFILE_LABEL: Record<RiskProfile, string> = {
  conservative: 'conservative',
  moderate: 'moderate',
  degen: 'degen',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatTiltEducation(indicator: TiltIndicator, profile: RiskProfile): TiltEducation {
  const sens = PROFILE_LABEL[profile];
  if (indicator.type === 'fast_clicks') {
    const n = indicator.metricValue ?? 0;
    return {
      patternLabel: 'Autopilot clicks',
      headline: 'Autopilot clicks — pace is climbing',
      metricLine: `${n} clicks in 5s · ${sens} sensitivity`,
      insightLine: 'Pace picked up — that\'s tilt speed, not bad luck.',
      triggerCard: `Autopilot clicks · ${n} in 5 seconds`,
    };
  }
  if (indicator.type === 'chasing_losses') {
    const n = indicator.metricValue ?? 0;
    return {
      patternLabel: 'Loss-chase',
      headline: 'Loss-chase — streak heating up',
      metricLine: `${n} losses tracked · ${sens} sensitivity`,
      insightLine: 'Chasing pattern — next bet often comes faster after red.',
      triggerCard: `Loss-chase · ${n} losses in a row`,
    };
  }
  const safe = escapeHtml(indicator.description);
  return {
    patternLabel: 'Tilt signal',
    headline: indicator.description,
    metricLine: `${sens} sensitivity`,
    insightLine: 'Slow down — past you set a line for moments like this.',
    triggerCard: safe,
  };
}

export function formatGameBlockEducation(label: string): {
  triggerCard: string;
  insightLine: string;
} {
  return {
    triggerCard: `${label} is on your no-play list`,
    insightLine: 'You listed this game — past you knew it wrecks you.',
  };
}
