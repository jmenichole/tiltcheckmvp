import { matchGameExclusion, normalizeHaystack } from '@tiltcheck/shared';
import type { GameExclusionEntry } from '@tiltcheck/shared';
import { triggerTouchGrassTimeout } from './enforcement.js';

export type GameMatchStatus = 'clear' | 'warn' | 'blocked' | 'demo-banner';

export type GameMatchState = {
  matched: GameExclusionEntry | null;
  status: GameMatchStatus;
  countdownSec?: number;
};

export type GameExclusionWatcherOptions = {
  onStateChange: (state: GameMatchState) => void;
  getDemoMode: () => boolean;
  getLoggedIn: () => boolean;
  getBlockDurationMs: () => number;
};

const WARN_ESCALATE_MS = 10_000;
const POLL_MS = 3_000;

export function buildGameHaystack(): string {
  const heading =
    document.querySelector('main h1')?.textContent?.trim() ??
    document.querySelector('h1')?.textContent?.trim() ??
    '';
  return normalizeHaystack([location.href, document.title, heading]);
}

export class GameExclusionWatcher {
  private exclusions: GameExclusionEntry[] = [];
  private warnStartedAt: number | null = null;
  private blocked = false;
  private activeMatch: GameExclusionEntry | null = null;
  private pollId: number | null = null;
  private countdownId: number | null = null;

  constructor(private options: GameExclusionWatcherOptions) {}

  setExclusions(entries: GameExclusionEntry[]) {
    this.exclusions = entries;
    if (!this.blocked) this.check();
  }

  start() {
    this.check();
    this.pollId = window.setInterval(() => this.check(), POLL_MS);
    this.patchHistory();
  }

  stop() {
    if (this.pollId !== null) clearInterval(this.pollId);
    if (this.countdownId !== null) clearInterval(this.countdownId);
  }

  private patchHistory() {
    const fire = () => {
      if (!this.blocked) this.check();
    };
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    history.pushState = (...args: Parameters<History['pushState']>) => {
      origPush(...args);
      fire();
    };
    history.replaceState = (...args: Parameters<History['replaceState']>) => {
      origReplace(...args);
      fire();
    };
    window.addEventListener('popstate', fire);
  }

  private emit(state: GameMatchState) {
    this.options.onStateChange(state);
  }

  private resetWarn() {
    this.warnStartedAt = null;
    if (this.countdownId !== null) {
      clearInterval(this.countdownId);
      this.countdownId = null;
    }
  }

  private triggerBlock(match: GameExclusionEntry) {
    if (this.blocked) return;
    this.blocked = true;
    this.resetWarn();

    const reason = `${match.label} is on your no-play list — tab locked before the tilt got worse.`;
    if (!this.options.getDemoMode() && this.options.getLoggedIn()) {
      triggerTouchGrassTimeout(reason, this.options.getBlockDurationMs());
    }

    this.emit({ matched: match, status: 'blocked' });
  }

  private startWarnCountdown(match: GameExclusionEntry) {
    if (this.countdownId !== null) return;
    if (!this.warnStartedAt) this.warnStartedAt = Date.now();

    const tick = () => {
      const elapsed = Date.now() - (this.warnStartedAt ?? Date.now());
      const remaining = Math.max(0, WARN_ESCALATE_MS - elapsed);
      const countdownSec = Math.ceil(remaining / 1000);

      if (remaining <= 0) {
        if (this.countdownId !== null) clearInterval(this.countdownId);
        this.countdownId = null;
        this.triggerBlock(match);
        return;
      }

      this.emit({ matched: match, status: 'warn', countdownSec });
    };

    tick();
    this.countdownId = window.setInterval(tick, 250);
  }

  private check() {
    if (this.blocked) return;

    const haystack = buildGameHaystack();
    const match = matchGameExclusion(haystack, this.exclusions);

    if (!match) {
      this.resetWarn();
      this.activeMatch = null;
      this.emit({ matched: null, status: 'clear' });
      return;
    }

    if (match.id !== this.activeMatch?.id) {
      this.resetWarn();
      this.activeMatch = match;
    }

    if (this.options.getDemoMode()) {
      this.emit({ matched: match, status: 'demo-banner' });
      return;
    }

    if (!this.options.getLoggedIn()) {
      this.emit({ matched: match, status: 'clear' });
      return;
    }

    if (match.mode === 'block') {
      this.triggerBlock(match);
      return;
    }

    this.startWarnCountdown(match);
  }
}
