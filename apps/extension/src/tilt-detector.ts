export interface TiltIndicator {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
}

export class TiltDetector {
  private clicks: number[] = [];
  private bets: Array<{ amount: number; timestamp: number; result: string }> = [];

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
    if (this.clicks.length < 12) return null;
    return {
      type: 'fast_clicks',
      severity: this.clicks.length >= 18 ? 'critical' : 'high',
      confidence: 0.8,
      description: 'Rapid clicking detected — take a break.',
    };
  }

  analyze(): TiltIndicator[] {
    const indicators: TiltIndicator[] = [];
    const fast = this.detectFastClicks();
    if (fast) indicators.push(fast);
    const recentLosses = this.bets.filter((b) => b.result === 'loss').length;
    if (recentLosses >= 4) {
      indicators.push({
        type: 'chasing_losses',
        severity: recentLosses >= 6 ? 'critical' : 'high',
        confidence: 0.75,
        description: 'Multiple losses in a short window.',
      });
    }
    return indicators;
  }
}
