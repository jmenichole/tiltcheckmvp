import type { AutoVaultConfig, StatusType, VaultEngine } from './types.js';
import {
  loadRateLimitData,
  loadVaultedSession,
  saveRateLimitData,
  saveVaultedSession,
} from './storage.js';

const LOG_PREFIX = '[TiltCheck AutoVault]';
const RATE_LIMIT_MAX = 50;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
const MIN_BALANCE_CHECKS = 2;
const BALANCE_INIT_RETRIES = 5;
const DEPOSIT_VAULT_PERCENTAGE = 0.2;
const CURRENCY_CACHE_TIMEOUT = 5000;
const CF_BACKOFF_MS = 60 * 1000;
const DEFAULT_US_CURRENCY = 'sc';

const BALANCE_SELECTORS = [
  '[data-testid="coin-toggle"] .content span[data-ds-text="true"]',
  '[data-testid="balance-toggle"] .content span[data-ds-text="true"]',
  '[data-testid="user-balance"] .numeric',
  '.numeric.variant-highlighted',
];

const FLAVOR = {
  profit: ['Heater — skimming the top.', 'Green spike — bagging some.'],
  bigWin: ['Big hit — secured to vault.', 'Heater confirmed — vaulting.'],
  deposit: ['Deposit in — skimming cut.'],
  start: ['AutoVault live. Watching the bag.', 'Skim mode on.'],
  stop: ['AutoVault paused.', 'Skim off — your call.'],
  rateLimit: ['Vault cap hit — cooling off.', 'Too many skims — retry soon.'],
};

function pickFlavor(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getCookie(name: string): string {
  const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return m ? (m.pop() ?? '').replace(/"/g, '') : '';
}

function parseStakeAmount(text: string | null | undefined): number {
  if (!text) return NaN;
  const raw = String(text).replace(/\u00a0/g, ' ').trim();
  const m = raw.match(/[-+]?\d[\d\s,.'']*(?:[.,]\d+)?/);
  if (!m) return NaN;
  let token = m[0].replace(/[\s'']/g, '');
  const hasDot = token.includes('.');
  const hasComma = token.includes(',');
  if (hasDot && hasComma) {
    if (token.lastIndexOf('.') > token.lastIndexOf(',')) token = token.replace(/,/g, '');
    else token = token.replace(/\./g, '').replace(/,/g, '.');
  } else if (hasComma && !hasDot) {
    const parts = token.split(',');
    token = parts.length === 2 && parts[1].length <= 2 ? `${parts[0]}.${parts[1]}` : token.replace(/,/g, '');
  } else token = token.replace(/,/g, '');
  const n = parseFloat(token);
  return isNaN(n) ? NaN : n;
}

const FIAT_DISPLAY = new Set(['USD', 'EUR', 'GBP', 'CAD', 'AUD']);

type BalanceApi = Record<string, number>;

const balanceState: {
  _api?: BalanceApi;
  lastKnown?: number;
  cached?: string;
  cacheTime?: number;
} = {};

function detectCurrencyFromBar(): string | null {
  const el = document.querySelector('[data-testid="coin-toggle"], [data-testid="balance-toggle"]');
  if (!el) return null;
  const matches = (el.textContent || '').match(/\b[A-Z]{2,5}\b/g);
  if (!matches) return null;
  for (const code of matches) {
    if (!FIAT_DISPLAY.has(code)) return code.toLowerCase();
  }
  return null;
}

function getCurrency(): string {
  const now = Date.now();
  if (balanceState.cached && balanceState.cacheTime && now - balanceState.cacheTime < CURRENCY_CACHE_TIMEOUT) {
    return balanceState.cached;
  }
  const el = document.querySelector('[data-active-currency]');
  if (el) {
    const c = el.getAttribute('data-active-currency');
    if (c) {
      balanceState.cached = c.toLowerCase();
      balanceState.cacheTime = now;
      return balanceState.cached;
    }
  }
  const fromBar = detectCurrencyFromBar();
  if (fromBar) {
    balanceState.cached = fromBar;
    balanceState.cacheTime = now;
    return fromBar;
  }
  const api = balanceState._api || {};
  const keys = Object.keys(api).sort((a, b) => (api[b] || 0) - (api[a] || 0));
  if (keys.length && api[keys[0]] > 0) {
    balanceState.cached = keys[0];
    balanceState.cacheTime = now;
    return keys[0];
  }
  balanceState.cached = DEFAULT_US_CURRENCY;
  balanceState.cacheTime = now;
  return DEFAULT_US_CURRENCY;
}

function isFiatDisplayActive(): boolean {
  const el = document.querySelector('[data-testid="coin-toggle"], [data-testid="balance-toggle"]');
  if (!el) return false;
  const txt = (el.textContent || '').trim();
  return /[$€£]/.test(txt) || /\bUSD\b/i.test(txt);
}

function getCurrentBalance(activeCurrency: string | null): number {
  const cur = (activeCurrency || getCurrency() || '').toLowerCase();
  const apiVal = balanceState._api?.[cur];
  if (typeof apiVal === 'number' && apiVal >= 0) {
    balanceState.lastKnown = apiVal;
    return apiVal;
  }
  if (isFiatDisplayActive()) return balanceState.lastKnown || 0;
  for (const sel of BALANCE_SELECTORS) {
    const el = document.querySelector(sel);
    if (el) {
      const val = parseStakeAmount(el.textContent);
      if (!isNaN(val) && val >= 0) {
        balanceState.lastKnown = val;
        return val;
      }
    }
  }
  return balanceState.lastKnown || 0;
}

class StakeApi {
  private apiUrl = window.location.origin + '/_api/graphql';

  private headers() {
    return {
      'content-type': 'application/json',
      'x-access-token': getCookie('session'),
      'x-language': 'en',
      'apollographql-client-name': 'stake.com',
      'apollographql-client-version': '1.0.0',
    };
  }

  constructor(private cloudflareLocked: () => boolean, private lockoutCf: (reason: string) => void) {}

  async call(body: string, opName?: string) {
    if (this.cloudflareLocked()) {
      return { error: true, type: 'cloudflare-lockout', message: 'CF backoff active' };
    }
    const headers: Record<string, string> = { ...this.headers() };
    if (opName) headers['x-operation-name'] = opName;
    try {
      const res = await fetch(this.apiUrl, {
        credentials: 'include',
        headers,
        referrer: window.location.origin,
        body,
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
      });
      const ct = res.headers.get('content-type') || '';
      const cfMit = res.headers.get('cf-mitigated');
      if (cfMit === 'challenge' || (ct.includes('text/html') && (res.status === 403 || res.status === 503))) {
        this.lockoutCf(`HTTP ${res.status}`);
        return { error: true, type: 'cloudflare', message: 'Cloudflare challenge' };
      }
      const raw = await res.text();
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        /* not json */
      }
      if (!res.ok) {
        if (raw && raw.trimStart().toLowerCase().startsWith('<!doctype')) {
          this.lockoutCf('HTML body');
          return { error: true, type: 'cloudflare' };
        }
        const errors = parsed?.errors as Array<{ message?: string }> | undefined;
        const detail = errors?.[0]?.message || res.statusText;
        return { error: true, status: res.status, message: detail, errors };
      }
      return parsed || {};
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      if (/failed to fetch|network/i.test(msg)) {
        this.lockoutCf('network');
        return { error: true, type: 'network', message: msg };
      }
      return { error: true, message: msg };
    }
  }

  getBalances() {
    const q = {
      query: `query UserBalances { user { id balances { available { amount currency } vault { amount currency } } } } }`,
      variables: {},
    };
    return this.call(JSON.stringify(q), 'UserBalances');
  }

  depositToVault(currency: string, amount: number) {
    const enumCurrency = String(currency || '').toLowerCase();
    const roundedAmount = Math.floor(Number(amount) * 1e8) / 1e8;
    const q = {
      query: `mutation CreateVaultDeposit($currency: CurrencyEnum!, $amount: Float!) {
                    createVaultDeposit(currency: $currency, amount: $amount) { id amount currency }
                }`,
      variables: { currency: enumCurrency, amount: roundedAmount },
    };
    return this.call(JSON.stringify(q), 'CreateVaultDeposit');
  }
}

export type StakeEngineCallbacks = {
  onLog: (message: string, type?: StatusType) => void;
  onVaultedChange: () => void;
  getConfig: () => AutoVaultConfig;
};

export function createStakeEngine(callbacks: StakeEngineCallbacks): VaultEngine & {
  activeCurrency: string | null;
  getCurrency: () => string;
  getCurrentBalance: () => number;
  refreshApiBalance: () => Promise<void>;
} {
  let cloudflareLockoutUntil = 0;
  let running = false;
  let stakeApi: StakeApi | null = null;
  let vaultInterval: ReturnType<typeof setInterval> | null = null;
  let apiBalanceInterval: ReturnType<typeof setInterval> | null = null;
  let activeCurrency: string | null = null;
  let oldBalance = 0;
  let lastBalance = 0;
  let isInitialized = false;
  let balanceChecks = 0;
  let isProcessing = false;
  let lastVaultedDeposit = 0;
  let vaultedSession = 0;
  let vaultActionTimestamps: number[] = [];

  const isCloudflareLocked = () => Date.now() < cloudflareLockoutUntil;
  const lockoutForCloudflare = (reason: string) => {
    cloudflareLockoutUntil = Date.now() + CF_BACKOFF_MS;
    callbacks.onLog(`Cloudflare challenge (${reason}). Backing off 60s.`, 'warning');
  };

  const log = (msg: string, type?: StatusType) => {
    console.log(LOG_PREFIX, msg);
    callbacks.onLog(msg, type);
  };

  async function reloadVaulted() {
    vaultedSession = await loadVaultedSession('stake-us', activeCurrency || DEFAULT_US_CURRENCY);
  }

  async function addVaulted(amount: number) {
    if (!amount || amount <= 0) return;
    vaultedSession += amount;
    await saveVaultedSession('stake-us', activeCurrency || DEFAULT_US_CURRENCY, vaultedSession);
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

  async function refreshApiBalance() {
    if (isCloudflareLocked()) return;
    try {
      if (!stakeApi) stakeApi = new StakeApi(isCloudflareLocked, lockoutForCloudflare);
      const cur = (activeCurrency || '').toLowerCase();
      if (!cur) return;
      const resp = (await stakeApi.getBalances()) as {
        data?: { user?: { balances?: Array<{ available?: { currency?: string; amount?: number | string } }> } };
      };
      const balances = resp?.data?.user?.balances;
      if (!Array.isArray(balances)) return;
      balanceState._api = balanceState._api || {};
      for (const entry of balances) {
        const code = entry?.available?.currency?.toLowerCase();
        if (!code) continue;
        const amt = entry.available?.amount;
        const n = typeof amt === 'number' ? amt : parseFloat(String(amt));
        if (!isNaN(n) && n >= 0) balanceState._api[code] = n;
      }
    } catch {
      /* blip */
    }
  }

  function startApiPolling() {
    if (apiBalanceInterval) clearInterval(apiBalanceInterval);
    apiBalanceInterval = setInterval(() => void refreshApiBalance(), 5000);
    void refreshApiBalance();
  }

  function stopApiPolling() {
    if (apiBalanceInterval) clearInterval(apiBalanceInterval);
    apiBalanceInterval = null;
  }

  function updateBaseline() {
    const cur = getCurrentBalance(activeCurrency);
    if (cur > 0) {
      oldBalance = cur;
      if (!isInitialized && balanceChecks++ >= MIN_BALANCE_CHECKS) {
        isInitialized = true;
        log(`Baseline: ${cur.toFixed(6)} ${(activeCurrency || DEFAULT_US_CURRENCY).toUpperCase()}`, 'info');
      }
    }
  }

  function detectDeposit(): number {
    const sels = ['[data-testid*="notification"]', '[class*="notification"]', '[class*="transaction"]'];
    for (const sel of sels) {
      for (const node of document.querySelectorAll(sel)) {
        const txt = (node.textContent || '').toLowerCase();
        if (txt.includes('deposit') && /\d/.test(txt)) {
          const amt = parseStakeAmount(node.textContent);
          if (!isNaN(amt) && amt > 0) return amt;
        }
      }
    }
    return 0;
  }

  async function processDeposit(amount: number, isBigWin: boolean) {
    const config = callbacks.getConfig();
    if (amount < 1e-8 || isProcessing) return;
    if (!(await canVaultNow())) {
      log(pickFlavor(FLAVOR.rateLimit), 'warning');
      return;
    }
    isProcessing = true;
    const pct = (config.saveAmount * (isBigWin ? config.bigWinMultiplier : 1) * 100).toFixed(0);
    log(
      `${pickFlavor(isBigWin ? FLAVOR.bigWin : FLAVOR.profit)} Vaulting ${pct}% — ${amount.toFixed(6)} ${(activeCurrency || DEFAULT_US_CURRENCY).toUpperCase()}`,
      isBigWin ? 'bigwin' : 'profit',
    );
    try {
      if (!stakeApi) stakeApi = new StakeApi(isCloudflareLocked, lockoutForCloudflare);
      const resp = (await stakeApi.depositToVault(activeCurrency || DEFAULT_US_CURRENCY, amount)) as {
        data?: { createVaultDeposit?: unknown };
        error?: boolean;
        type?: string;
        message?: string;
        errors?: Array<{ message?: string }>;
      };
      isProcessing = false;
      if (resp?.data?.createVaultDeposit) {
        await recordVaultAction();
        await addVaulted(amount);
        oldBalance = getCurrentBalance(activeCurrency);
        log(`Secured ${amount.toFixed(6)} ${(activeCurrency || DEFAULT_US_CURRENCY).toUpperCase()}`, 'success');
        return;
      }
      if (resp?.error) {
        if (resp.type === 'cloudflare' || resp.type === 'cloudflare-lockout') {
          log('CF backoff — vault skipped.', 'warning');
        } else {
          log(`Vault failed: ${resp.message || 'unknown'}`, 'error');
        }
        return;
      }
      const gql = resp?.errors?.[0]?.message;
      if (gql) log(`Stake: ${gql}`, 'error');
      else log('Vault returned no data.', 'error');
    } catch (e) {
      isProcessing = false;
      log('Vault error: ' + (e instanceof Error ? e.message : 'unknown'), 'error');
    }
  }

  function checkBalanceChanges() {
    const config = callbacks.getConfig();
    balanceState.cached = undefined;
    const newCur = getCurrency();
    if (newCur !== activeCurrency) {
      activeCurrency = newCur;
      void reloadVaulted().then(() => callbacks.onVaultedChange());
      isInitialized = false;
      balanceChecks = 0;
      log(`Currency → ${newCur.toUpperCase()}`, 'info');
    }
    const cur = getCurrentBalance(activeCurrency);
    if (!isInitialized) {
      updateBaseline();
      return;
    }
    const dep = detectDeposit();
    if (dep > 0 && cur - lastBalance >= dep * 0.95 && lastVaultedDeposit !== dep) {
      void processDeposit(dep * DEPOSIT_VAULT_PERCENTAGE, false);
      lastVaultedDeposit = dep;
      oldBalance = cur;
    } else if (cur > oldBalance) {
      const profit = cur - oldBalance;
      const isBig = cur > oldBalance * config.bigWinThreshold;
      const depAmt = profit * config.saveAmount * (isBig ? config.bigWinMultiplier : 1);
      void processDeposit(depAmt, isBig);
      oldBalance = cur;
    } else if (cur < oldBalance) {
      oldBalance = cur;
    }
    lastBalance = cur;
  }

  return {
    activeCurrency,
    getCurrency,
    getCurrentBalance: () => getCurrentBalance(activeCurrency),
    refreshApiBalance,
    isRunning: () => running,
    formatVaulted: () => {
      const c = (activeCurrency || DEFAULT_US_CURRENCY).toUpperCase();
      return `${vaultedSession.toFixed(6)} ${c} vaulted`;
    },
    start() {
      if (running) return;
      if (!getCookie('session')) {
        log('Log in to Stake.us first.', 'warning');
        return;
      }
      running = true;
      stakeApi = new StakeApi(isCloudflareLocked, lockoutForCloudflare);
      activeCurrency = getCurrency();
      startApiPolling();
      oldBalance = 0;
      isInitialized = false;
      balanceChecks = 0;
      isProcessing = false;
      lastBalance = getCurrentBalance(activeCurrency);
      lastVaultedDeposit = 0;
      void loadRateLimitData().then((ts) => {
        vaultActionTimestamps = ts;
      });
      void reloadVaulted();
      let tries = 0;
      const boot = setInterval(() => {
        if (!running) {
          clearInterval(boot);
          return;
        }
        updateBaseline();
        if (++tries >= BALANCE_INIT_RETRIES && !isInitialized && getCurrentBalance(activeCurrency) > 0) {
          isInitialized = true;
          oldBalance = getCurrentBalance(activeCurrency);
        }
      }, 1000);
      if (vaultInterval) clearInterval(vaultInterval);
      vaultInterval = setInterval(() => checkBalanceChanges(), callbacks.getConfig().checkInterval * 1000);
      log(pickFlavor(FLAVOR.start), 'success');
      log(`Watching ${(activeCurrency || DEFAULT_US_CURRENCY).toUpperCase()}`, 'info');
    },
    stop() {
      if (!running) return;
      running = false;
      if (vaultInterval) clearInterval(vaultInterval);
      vaultInterval = null;
      stopApiPolling();
      log(pickFlavor(FLAVOR.stop), 'info');
    },
    kill() {
      if (running) {
        running = false;
        if (vaultInterval) clearInterval(vaultInterval);
        vaultInterval = null;
        stopApiPolling();
      }
      log('Kill switch — monitoring stopped.', 'warning');
    },
  };
}
