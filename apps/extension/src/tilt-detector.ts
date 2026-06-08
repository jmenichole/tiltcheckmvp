export type RiskProfile = 'conservative' | 'moderate' | 'degen';

export interface TiltIndicator {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
}

type ProfileThresholds = {
  fastClicksMin: number;
  fastClicksHigh: number;
  fastClicksCritical: number;
  lossMin: number;
  lossHigh: number;
  lossCritical: number;
};

/** Spec §2.2 — critical thresholds per profile; high/medium derived for early warnings. */
const PROFILE_THRESHOLDS: Record<RiskProfile, ProfileThresholds> = {
  conservative: {
    fastClicksMin: 6,
    fastClicksHigh: 8,
    fastClicksCritical: 10,
    lossMin: 2,
    lossHigh: 3,
    lossCritical: 4,
  },
  moderate: {
    fastClicksMin: 10,
    fastClicksHigh: 12,
    fastClicksCritical: 14,
    lossMin: 3,
    lossHigh: 4,
    lossCritical: 5,
  },
  degen: {
    fastClicksMin: 14,
    fastClicksHigh: 17,
    fastClicksCritical: 20,
    lossMin: 5,
    lossHigh: 6,
    lossCritical: 7,
  },
};

function clickSeverity(count: number, t: ProfileThresholds): TiltIndicator['severity'] | null {
  if (count < t.fastClicksMin) return null;
  if (count >= t.fastClicksCritical) return 'critical';
  if (count >= t.fastClicksHigh) return 'high';
  return 'medium';
}

function lossSeverity(count: number, t: ProfileThresholds): TiltIndicator['severity'] | null {
  if (count < t.lossMin) return null;
  if (count >= t.lossCritical) return 'critical';
  if (count >= t.lossHigh) return 'high';
  return 'medium';
}

export class TiltDetector {
  private clicks: number[] = [];
  private bets: Array<{ amount: number; timestamp: number; result: string }> = [];
  private profile: RiskProfile;

  constructor(profile: RiskProfile = 'moderate') {
    this.profile = profile;
  }

  setProfile(profile: RiskProfile) {
    this.profile = profile;
  }

  getProfile(): RiskProfile {
    return this.profile;
  }

  getClicksIn5s(): number {
    const now = Date.now();
    this.clicks = this.clicks.filter((t) => now - t < 5000);
    return this.clicks.length;
  }

  recordClick() {
    const now = Date.now();
    this.clicks.push(now);
    this.clicks = this.clicks.filter((t) => now - t < 5000);
  }

  recordBet(amount: number, result: string) {
    this.bets.push({ amount, timestamp: Date.now(), result });
    if (this.bets.length > 50) this.bets.shift();
  }

  detectFastClicks(): TiltIndicator | null {
    const count = this.getClicksIn5s();
    const t = PROFILE_THRESHOLDS[this.profile];
    const severity = clickSeverity(count, t);
    if (!severity) return null;
    return {
      type: 'fast_clicks',
      severity,
      confidence: 0.8,
      description: 'Rapid clicking detected — take a break.',
    };
  }

  analyze(): TiltIndicator[] {
    const indicators: TiltIndicator[] = [];
    const fast = this.detectFastClicks();
    if (fast) indicators.push(fast);

    const t = PROFILE_THRESHOLDS[this.profile];
    const recentLosses = this.bets.filter((b) => b.result === 'loss').length;
    const lossSev = lossSeverity(recentLosses, t);
    if (lossSev) {
      indicators.push({
        type: 'chasing_losses',
        severity: lossSev,
        confidence: 0.75,
        description: 'Multiple losses in a short window.',
      });
    }
    return indicators;
  }
}
