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

  analyze(): TiltIndicator[] {
    const indicators: TiltIndicator[] = [];
    if (this.clicks.length >= 12) {
      indicators.push({
        type: 'fast_clicks',
        severity: 'medium',
        confidence: 0.7,
        description: 'Rapid clicking detected in the last 5 seconds.',
      });
    }
    const recentLosses = this.bets.filter((b) => b.result === 'loss').length;
    if (recentLosses >= 4) {
      indicators.push({
        type: 'chasing_losses',
        severity: 'high',
        confidence: 0.75,
        description: 'Multiple losses in a short window.',
      });
    }
    return indicators;
  }
}
