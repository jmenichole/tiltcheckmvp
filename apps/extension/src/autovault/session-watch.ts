import type { AutoVaultSite } from './types.js';
import { SessionTracker, formatWagerLine } from './session-tracker.js';
import { unitToSol } from './nuts-engine.js';
import type { createStakeEngine } from './stake-engine.js';
import type { createNutsEngine } from './nuts-engine.js';
import { getConfig } from './storage.js';

type StakeEngine = ReturnType<typeof createStakeEngine>;
type NutsEngine = ReturnType<typeof createNutsEngine>;

const MIN_BALANCE_CHECKS = 2;

export function createSessionWatch(
  site: AutoVaultSite,
  stakeEngine: StakeEngine | null,
  nutsEngine: NutsEngine | null,
  onRender: () => void,
) {
  const sessionTracker = new SessionTracker();
  let oldBalance = 0;
  let initialized = false;
  let balanceChecks = 0;
  let interval: ReturnType<typeof setInterval> | null = null;
  let currency: string | null = null;

  function readBalance(): number | null {
    if (site.mode === 'stake-us' && stakeEngine) return stakeEngine.getCurrentBalance();
    if (site.mode === 'nuts-ws' && nutsEngine && nutsEngine.playBalance !== null) {
      return unitToSol(nutsEngine.playBalance);
    }
    return null;
  }

  function sessionUnitLabel(): string {
    if (site.mode === 'stake-us' && stakeEngine) {
      return (stakeEngine.activeCurrency || stakeEngine.getCurrency() || 'sc').toUpperCase();
    }
    return 'SOL';
  }

  return {
    tracker: sessionTracker,
    sessionUnitLabel,
    formatWagerLine: () => formatWagerLine(sessionTracker.snapshot()),

    start() {
      if (interval) return;
      const cur = readBalance() || 0;
      sessionTracker.reset(cur);
      oldBalance = cur;
      initialized = false;
      balanceChecks = 0;
      currency = site.mode === 'stake-us' ? (stakeEngine?.getCurrency() ?? 'sc') : 'sol';
      interval = setInterval(() => this.tick(), getConfig().checkInterval * 1000);
      this.tick();
    },

    stop() {
      if (interval) clearInterval(interval);
      interval = null;
    },

    resetSession() {
      const cur = readBalance();
      sessionTracker.reset(cur || 0);
      oldBalance = cur || 0;
      initialized = (cur || 0) > 0;
      balanceChecks = 0;
      onRender();
    },

    onNutsBalance(prevUnits: number | null, nextUnits: number) {
      if (nextUnits === null || (prevUnits !== null && prevUnits === nextUnits)) return;
      if (prevUnits === null) {
        const next = unitToSol(nextUnits);
        if (!initialized && next > 0 && ++balanceChecks >= MIN_BALANCE_CHECKS) {
          initialized = true;
          oldBalance = next;
          sessionTracker.reset(next);
          onRender();
        }
        return;
      }
      const prev = unitToSol(prevUnits);
      const next = unitToSol(nextUnits);
      if (!initialized) {
        if (next > 0 && ++balanceChecks >= MIN_BALANCE_CHECKS) {
          initialized = true;
          oldBalance = next;
          sessionTracker.reset(next);
        }
        return;
      }
      sessionTracker.recordBalanceChange(prev, next);
      oldBalance = next;
      onRender();
    },

    tick() {
      if (site.mode === 'stake-us' && stakeEngine) {
        const newCur = stakeEngine.getCurrency();
        if (newCur !== currency) {
          currency = newCur;
          const cur = stakeEngine.getCurrentBalance();
          sessionTracker.reset(cur || 0);
          oldBalance = cur || 0;
          initialized = false;
          balanceChecks = 0;
        }
        const cur = stakeEngine.getCurrentBalance();
        if (!initialized) {
          if (cur > 0 && ++balanceChecks >= MIN_BALANCE_CHECKS) {
            initialized = true;
            oldBalance = cur;
            sessionTracker.reset(cur);
          }
          return;
        }
        if (cur !== oldBalance) {
          sessionTracker.recordBalanceChange(oldBalance, cur);
          oldBalance = cur;
          onRender();
        }
        return;
      }

      const cur = readBalance();
      if (cur === null) return;
      if (!initialized) {
        if (cur > 0 && ++balanceChecks >= MIN_BALANCE_CHECKS) {
          initialized = true;
          oldBalance = cur;
          sessionTracker.reset(cur);
        }
      }
    },
  };
}
