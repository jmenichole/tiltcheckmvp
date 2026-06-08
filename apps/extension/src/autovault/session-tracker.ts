export type SessionSnapshot = {
  startedAt: number;
  updatedAt: number | null;
  rounds: number;
  wagered: number;
  won: number;
  profitLoss: number;
  rtp: number | null;
  consecutiveLosses: number;
};

export class SessionTracker {
  private startedAt = Date.now();
  private updatedAt: number | null = null;
  private rounds = 0;
  private wagered = 0;
  private won = 0;
  private consecutiveLosses = 0;
  private fastRoundStreak = 0;
  private lastRoundAt: number | null = null;
  private startingBalance: number | null = null;
  private currentBalance: number | null = null;

  reset(startingBalance: number | null = null): void {
    this.startedAt = Date.now();
    this.updatedAt = null;
    this.rounds = 0;
    this.wagered = 0;
    this.won = 0;
    this.consecutiveLosses = 0;
    this.fastRoundStreak = 0;
    this.lastRoundAt = null;
    this.startingBalance = Number.isFinite(startingBalance) ? startingBalance : null;
    this.currentBalance = this.startingBalance;
  }

  recordBalanceChange(previousBalance: number, currentBalance: number, timestamp = Date.now()): SessionSnapshot {
    if (
      !Number.isFinite(previousBalance) ||
      !Number.isFinite(currentBalance) ||
      previousBalance === currentBalance
    ) {
      return this.snapshot();
    }
    const delta = currentBalance - previousBalance;
    return this.recordRound({
      wagered: delta < 0 ? Math.abs(delta) : 0,
      won: delta > 0 ? delta : 0,
      balance: currentBalance,
      timestamp,
    });
  }

  recordRound(round: { wagered: number; won: number; balance: number | null; timestamp: number }): SessionSnapshot {
    const wagered = this.toMoneyValue(round.wagered);
    const won = this.toMoneyValue(round.won);
    const balance = Number.isFinite(round.balance ?? NaN) ? (round.balance as number) : null;
    const timestamp = Number.isFinite(round.timestamp) ? round.timestamp : Date.now();
    const isLoss = wagered > 0 && won <= 0;

    this.rounds += 1;
    this.wagered += wagered;
    this.won += won;
    this.updatedAt = timestamp;

    if (balance !== null) {
      if (this.startingBalance === null) this.startingBalance = balance;
      this.currentBalance = balance;
    }

    if (this.lastRoundAt !== null && timestamp - this.lastRoundAt > 0 && timestamp - this.lastRoundAt <= 2000) {
      this.fastRoundStreak += 1;
    } else {
      this.fastRoundStreak = 0;
    }

    this.consecutiveLosses = isLoss ? this.consecutiveLosses + 1 : 0;
    this.lastRoundAt = timestamp;

    return this.snapshot();
  }

  snapshot(): SessionSnapshot {
    const profitLoss = this.won - this.wagered;
    const rtp = this.wagered > 0 ? (this.won / this.wagered) * 100 : null;
    return {
      startedAt: this.startedAt,
      updatedAt: this.updatedAt,
      rounds: this.rounds,
      wagered: this.wagered,
      won: this.won,
      profitLoss,
      rtp,
      consecutiveLosses: this.consecutiveLosses,
    };
  }

  private toMoneyValue(value: number): number {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }
}

export function formatWagerLine(snap: SessionSnapshot): string {
  if (!snap || snap.rounds === 0) return 'Session: no bets tracked yet';
  const pl = snap.profitLoss;
  const sign = pl >= 0 ? '+' : '';
  const rtp = snap.rtp !== null ? ` · ${snap.rtp.toFixed(1)}% RTP` : '';
  return `Wagered ${snap.wagered.toFixed(4)} · ${sign}${pl.toFixed(4)} P/L · ${snap.rounds} rnd${rtp}`;
}
