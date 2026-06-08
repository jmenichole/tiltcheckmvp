import type { AutoVaultConfig, StatusType, VaultEngine } from './types.js';
import { NUTS_MSG_SOURCE } from './types.js';
import {
  loadRateLimitData,
  loadVaultedSession,
  saveRateLimitData,
  saveVaultedSession,
} from './storage.js';

const LOG_PREFIX = '[TiltCheck AutoVault]';
const NUTS_UNIT = 1_000_000_000;
const RATE_LIMIT_MAX = 50;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
const MIN_BALANCE_CHECKS = 2;
const DEV_USERNAME = 'jmenichole';
const AUTO_TIP_PERCENT = 0.01;
const ISOLATED_SOURCE = 'tc-av-nuts-isolated';

const FLAVOR = {
  profit: ['Heater — skimming the top.', 'Green spike — bagging some.'],
  bigWin: ['Big hit — secured to vault.', 'Heater confirmed — vaulting.'],
  start: ['AutoVault live. Watching the bag.', 'Skim mode on.'],
  stop: ['AutoVault paused.', 'Skim off — your call.'],
  rateLimit: ['Vault cap hit — cooling off.', 'Too many skims — retry soon.'],
};

function pickFlavor(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const unitToSol = (u: number) => (Number(u) || 0) / NUTS_UNIT;
export const solToUnit = (s: number) => Math.floor(Number(s) * NUTS_UNIT);

export type NutsEngineCallbacks = {
  onLog: (message: string, type?: StatusType) => void;
  onVaultedChange: () => void;
  onBalanceChange: (prev: number | null, next: number) => void;
  getConfig: () => AutoVaultConfig;
};

export function createNutsEngine(callbacks: NutsEngineCallbacks): VaultEngine & {
  playBalance: number | null;
  socketReady: boolean;
  destroyBridge: () => void;
} {
  let running = false;
  let playBalance: number | null = null;
  let vaultBalance: number | null = null;
  let oldBalance: number | null = null;
  let previousVaultBalance: number | null = null;
  let isInitialized = false;
  let balanceChecks = 0;
  let isProcessing = false;
  let socketReady = false;
  let vaultInterval: ReturnType<typeof setInterval> | null = null;
  let vaultedSession = 0;
  let vaultActionTimestamps: number[] = [];

  const log = (msg: string, type?: StatusType) => {
    console.log(LOG_PREFIX, msg);
    callbacks.onLog(msg, type);
  };

  async function reloadVaulted() {
    vaultedSession = await loadVaultedSession('nuts-ws', 'nuts-sol');
  }

  async function addVaulted(amountSol: number) {
    if (!amountSol || amountSol <= 0) return;
    vaultedSession += amountSol;
    await saveVaultedSession('nuts-ws', 'nuts-sol', vaultedSession);
    callbacks.onVaultedChange();
  }

  async function canVaultNow() {
    const now = Date.now();
    vaultActionTimestamps = (await loadRateLimitData()).filter((ts) => now - ts < RATE_LIMIT_WINDOW);
    await saveRateLimitData(vaultActionTimestamps);
    return vaultActionTimestamps.length < RATE_LIMIT_MAX;
  }

  async function recordVaultAction() {
    vaultActionTimestamps.push(Date.now());
    await saveRateLimitData(vaultActionTimestamps);
  }

  function requestDeposit(amountUnits: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        if (event.source !== window) return;
        const data = event.data as { source?: string; type?: string; ok?: boolean; error?: string };
        if (data?.source !== NUTS_MSG_SOURCE || data.type !== 'deposit-result') return;
        window.removeEventListener('message', handler);
        if (data.ok) resolve();
        else reject(new Error(data.error || 'Deposit failed'));
      };
      window.addEventListener('message', handler);
      window.postMessage(
        { source: ISOLATED_SOURCE, type: 'request-deposit', amountUnits },
        '*',
      );
      setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Deposit timed out'));
      }, 16000);
    });
  }

  function requestTip(amountUnits: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        if (event.source !== window) return;
        const data = event.data as { source?: string; type?: string; ok?: boolean; error?: string };
        if (data?.source !== NUTS_MSG_SOURCE || data.type !== 'tip-result') return;
        window.removeEventListener('message', handler);
        if (data.ok) resolve();
        else reject(new Error(data.error || 'Tip failed'));
      };
      window.addEventListener('message', handler);
      window.postMessage(
        { source: ISOLATED_SOURCE, type: 'request-tip', amountUnits, recipient: DEV_USERNAME },
        '*',
      );
      setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Tip timed out'));
      }, 16000);
    });
  }

  const onBridgeMessage = (event: MessageEvent) => {
    if (event.source !== window) return;
    const data = event.data as {
      source?: string;
      type?: string;
      prev?: number | null;
      next?: number;
    };
    if (data?.source !== NUTS_MSG_SOURCE) return;

    if (data.type === 'socket-ready') {
      socketReady = true;
      log('nuts.tools socket ready', 'info');
    }

    if (data.type === 'balance' && typeof data.next === 'number') {
      const prevBalance = playBalance;
      playBalance = data.next;
      callbacks.onBalanceChange(prevBalance, playBalance);
      if (playBalance > 0 && oldBalance === null) oldBalance = playBalance;
      if (!isInitialized && ++balanceChecks >= MIN_BALANCE_CHECKS && playBalance > 0) {
        isInitialized = true;
        oldBalance = playBalance;
        log(`Baseline: ${unitToSol(playBalance).toFixed(6)} SOL`, 'info');
      }
      callbacks.onVaultedChange();
    }

    if (data.type === 'vault-balance' && typeof data.next === 'number') {
      const newVault = data.next;
      const config = callbacks.getConfig();
      if (
        previousVaultBalance !== null &&
        newVault < previousVaultBalance &&
        config.autoTipEnabled
      ) {
        const withdrawn = previousVaultBalance - newVault;
        let tipUnits = Math.floor(withdrawn * AUTO_TIP_PERCENT);
        const minTip = solToUnit(0.0001);
        if (tipUnits < minTip) tipUnits = minTip;
        if (withdrawn > tipUnits) {
          requestTip(tipUnits)
            .then(() => log('Dev auto-tip sent.', 'success'))
            .catch((e) => log(`Tip failed: ${e.message}`, 'error'));
        }
      }
      previousVaultBalance = newVault;
      vaultBalance = newVault;
    }
  };

  window.addEventListener('message', onBridgeMessage);

  async function processDeposit(amountUnits: number, isBigWin: boolean) {
    const config = callbacks.getConfig();
    if (amountUnits < solToUnit(config.minDepositSol) || isProcessing) return;
    if (!(await canVaultNow())) {
      log(pickFlavor(FLAVOR.rateLimit), 'warning');
      return;
    }
    if (!socketReady) {
      log('Socket not authenticated yet.', 'warning');
      return;
    }
    isProcessing = true;
    const pct = (config.saveAmount * (isBigWin ? config.bigWinMultiplier : 1) * 100).toFixed(0);
    log(
      `${pickFlavor(isBigWin ? FLAVOR.bigWin : FLAVOR.profit)} Vaulting ${pct}% — ${unitToSol(amountUnits).toFixed(6)} SOL`,
      isBigWin ? 'bigwin' : 'profit',
    );
    try {
      await requestDeposit(amountUnits);
      await recordVaultAction();
      await addVaulted(unitToSol(amountUnits));
      oldBalance = playBalance;
      log(`Secured ${unitToSol(amountUnits).toFixed(6)} SOL`, 'success');
    } catch (e) {
      log(`Vault error: ${e instanceof Error ? e.message : 'unknown'}`, 'error');
    }
    isProcessing = false;
  }

  function checkBalanceChanges() {
    const config = callbacks.getConfig();
    if (playBalance === null || !isInitialized) return;
    if (oldBalance === null) {
      oldBalance = playBalance;
      return;
    }
    if (playBalance > oldBalance) {
      const profit = playBalance - oldBalance;
      const isBig = (oldBalance > 0 ? playBalance / oldBalance : 1) >= config.bigWinThreshold;
      const dep = Math.floor(profit * config.saveAmount * (isBig ? config.bigWinMultiplier : 1));
      if (dep > 0) void processDeposit(dep, isBig);
      oldBalance = playBalance;
    } else if (playBalance < oldBalance) {
      oldBalance = playBalance;
    }
  }

  void reloadVaulted();
  void loadRateLimitData().then((ts) => {
    vaultActionTimestamps = ts;
  });

  return {
    playBalance,
    socketReady,
    destroyBridge: () => window.removeEventListener('message', onBridgeMessage),
    isRunning: () => running,
    formatVaulted: () => `${vaultedSession.toFixed(6)} SOL vaulted`,
    start() {
      if (running) return;
      running = true;
      oldBalance = playBalance;
      isProcessing = false;
      balanceChecks = 0;
      isInitialized = false;
      void reloadVaulted();
      void loadRateLimitData().then((ts) => {
        vaultActionTimestamps = ts;
      });
      if (vaultInterval) clearInterval(vaultInterval);
      vaultInterval = setInterval(() => checkBalanceChanges(), callbacks.getConfig().checkInterval * 1000);
      log(pickFlavor(FLAVOR.start), 'success');
    },
    stop() {
      if (!running) return;
      running = false;
      if (vaultInterval) clearInterval(vaultInterval);
      vaultInterval = null;
      log(pickFlavor(FLAVOR.stop), 'info');
    },
    kill() {
      if (running) {
        running = false;
        if (vaultInterval) clearInterval(vaultInterval);
        vaultInterval = null;
      }
      log('Kill switch — monitoring stopped.', 'warning');
    },
  };
}
