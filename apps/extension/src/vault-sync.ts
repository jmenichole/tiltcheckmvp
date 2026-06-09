import {
  normalizeSessionCapConfig,
  normalizeVaultPledgeConfig,
  isPledgeActive,
  pledgeAppliesToSite,
  type SessionCapConfig,
} from '@tiltcheck/shared';
import { apiBaseUrl } from './config.js';

export interface VaultRuleSnapshot {
  ruleType: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export type VaultRulesFetchResult =
  | { ok: true; rules: VaultRuleSnapshot[] }
  | { ok: false };

export async function fetchVaultRules(token: string | null): Promise<VaultRulesFetchResult> {
  if (!token) return { ok: false };
  try {
    const res = await fetch(`${apiBaseUrl()}/vault`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { rules?: VaultRuleSnapshot[] };
    return { ok: true, rules: (data.rules ?? []).filter((r) => r.enabled) };
  } catch {
    return { ok: false };
  }
}

export function getSessionCapConfig(rules: VaultRuleSnapshot[]): SessionCapConfig {
  const cap = rules.find((r) => r.ruleType === 'session_cap' && r.enabled);
  return normalizeSessionCapConfig(cap?.config ?? {});
}

export function sessionCapDurationMs(rules: VaultRuleSnapshot[]): number {
  return getSessionCapConfig(rules).durationMinutes * 60 * 1000;
}

export function getVaultPledgeConfig(
  rules: VaultRuleSnapshot[],
): ReturnType<typeof normalizeVaultPledgeConfig> | null {
  const rule = rules.find((r) => r.ruleType === 'vault_pledge' && r.enabled);
  if (!rule) return null;
  const config = normalizeVaultPledgeConfig(rule.config);
  return isPledgeActive(config) ? config : null;
}

export function getActivePledgeForSite(
  rules: VaultRuleSnapshot[],
  site: 'stake_us' | 'nuts',
): ReturnType<typeof normalizeVaultPledgeConfig> | null {
  const config = getVaultPledgeConfig(rules);
  if (!config) return null;
  return pledgeAppliesToSite(config, site) ? config : null;
}

export async function pushSessionCapConfig(
  token: string,
  config: Partial<SessionCapConfig>,
): Promise<{ ok: true; rules: VaultRuleSnapshot[] } | { ok: false; error: string }> {
  const merged = normalizeSessionCapConfig(config as Record<string, unknown>);
  try {
    const res = await fetch(`${apiBaseUrl()}/vault`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ruleType: 'session_cap',
        enabled: true,
        config: merged,
      }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: err?.error ?? `Save failed (${res.status})` };
    }
    const data = (await res.json()) as { rules?: VaultRuleSnapshot[] };
    const rules = (data.rules ?? []).filter((r) => r.enabled);
    await chrome.storage.local.set({ tc_vault_rules: rules });
    return { ok: true, rules };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

export async function pushSessionCapMinutes(
  token: string,
  durationMinutes: number,
): Promise<{ ok: true; rules: VaultRuleSnapshot[] } | { ok: false; error: string }> {
  const stored = await chrome.storage.local.get(['tc_vault_rules']);
  const existing = getSessionCapConfig(
    (stored.tc_vault_rules as VaultRuleSnapshot[] | undefined) ?? [],
  );
  return pushSessionCapConfig(token, { ...existing, durationMinutes });
}
