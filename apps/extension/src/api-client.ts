import { apiBaseUrl } from './config.js';

export type VaultRule = {
  id: string;
  ruleType: string;
  enabled: boolean;
  config: Record<string, unknown>;
};

export async function getSessionToken(): Promise<string | null> {
  const stored = await chrome.storage.local.get(['tc_session_token']);
  return typeof stored.tc_session_token === 'string' ? stored.tc_session_token : null;
}

export async function fetchVaultRules(): Promise<VaultRule[]> {
  const token = await getSessionToken();
  if (!token) return [];
  const res = await fetch(`${apiBaseUrl()}/vault`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { rules?: VaultRule[] };
  return data.rules ?? [];
}

export function enforcementDurationMs(rules: VaultRule[]): number {
  const cooldown = rules.find((r) => r.enabled && r.ruleType === 'tilt_cooldown');
  if (cooldown && typeof cooldown.config.cooldownMs === 'number') {
    return Math.max(15_000, Number(cooldown.config.cooldownMs));
  }
  return 45_000;
}

export function hasSessionCap(rules: VaultRule[]): boolean {
  return rules.some((r) => r.enabled && r.ruleType === 'session_cap');
}
