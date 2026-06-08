import type { AutoVaultConfig, AutoVaultSiteMode } from './types.js';

const PREFIX = 'tc_autovault';
const LEGACY_PREFIX = 'tiltcheck-autovault-share';

export const DEFAULT_CONFIG: AutoVaultConfig = {
  saveAmount: 0.1,
  bigWinThreshold: 5,
  bigWinMultiplier: 3,
  checkInterval: 90,
  minDepositSol: 0.001,
  autoTipEnabled: false,
};

let configCache: AutoVaultConfig = { ...DEFAULT_CONFIG };

function configKey(): string {
  return `${PREFIX}-config`;
}

export function getConfig(): AutoVaultConfig {
  return { ...configCache };
}

export async function loadConfig(): Promise<AutoVaultConfig> {
  const stored = await chrome.storage.local.get([configKey(), `${LEGACY_PREFIX}-config`]);
  let raw = stored[configKey()] as AutoVaultConfig | undefined;
  if (!raw && stored[`${LEGACY_PREFIX}-config`]) {
    try {
      raw =
        typeof stored[`${LEGACY_PREFIX}-config`] === 'string'
          ? JSON.parse(stored[`${LEGACY_PREFIX}-config`] as string)
          : (stored[`${LEGACY_PREFIX}-config`] as AutoVaultConfig);
    } catch {
      /* ignore */
    }
  }
  if (raw && typeof raw === 'object') {
    const parsed = { ...DEFAULT_CONFIG, ...raw };
    if (typeof parsed.checkInterval === 'number' && parsed.checkInterval > 300) {
      parsed.checkInterval = Math.round(parsed.checkInterval / 1000);
    }
    configCache = parsed;
  }
  return getConfig();
}

export async function saveConfig(cfg: AutoVaultConfig): Promise<void> {
  configCache = { ...cfg };
  await chrome.storage.local.set({ [configKey()]: configCache });
}

export async function isOnboarded(): Promise<boolean> {
  const stored = await chrome.storage.local.get([`${PREFIX}-onboarded`]);
  return stored[`${PREFIX}-onboarded`] === true;
}

export async function setOnboarded(): Promise<void> {
  await chrome.storage.local.set({ [`${PREFIX}-onboarded`]: true });
}

export async function resetOnboarding(): Promise<void> {
  await chrome.storage.local.remove(`${PREFIX}-onboarded`);
}

export async function getLastRunning(): Promise<boolean> {
  const stored = await chrome.storage.local.get([`${PREFIX}-last-running`]);
  return stored[`${PREFIX}-last-running`] === true;
}

export async function setLastRunning(on: boolean): Promise<void> {
  if (on) await chrome.storage.local.set({ [`${PREFIX}-last-running`]: true });
  else await chrome.storage.local.remove(`${PREFIX}-last-running`);
}

function vaultedKey(mode: AutoVaultSiteMode, currencySuffix: string): string {
  const suffix = mode === 'stake-us' ? currencySuffix : 'nuts-sol';
  return `${PREFIX}-vaulted:${suffix}`;
}

export async function loadVaultedSession(mode: AutoVaultSiteMode, currencySuffix: string): Promise<number> {
  const key = vaultedKey(mode, currencySuffix);
  const stored = await chrome.storage.session.get([key]);
  const v = parseFloat(String(stored[key] ?? '0'));
  return !Number.isNaN(v) && v >= 0 ? v : 0;
}

export async function saveVaultedSession(
  mode: AutoVaultSiteMode,
  currencySuffix: string,
  amount: number,
): Promise<void> {
  await chrome.storage.session.set({ [vaultedKey(mode, currencySuffix)]: String(amount) });
}

const RATE_KEY = `${PREFIX}-ratelimit`;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;

export async function loadRateLimitData(): Promise<number[]> {
  const stored = await chrome.storage.session.get([RATE_KEY]);
  const raw = stored[RATE_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.filter((ts: number) => Date.now() - ts < RATE_LIMIT_WINDOW);
}

export async function saveRateLimitData(ts: number[]): Promise<void> {
  await chrome.storage.session.set({ [RATE_KEY]: ts });
}
