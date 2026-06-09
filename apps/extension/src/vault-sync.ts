import { normalizeSessionCapConfig, type SessionCapConfig } from '@tiltcheck/shared';
import { apiBaseUrl } from './config.js';

export interface VaultRuleSnapshot {
  ruleType: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export async function fetchVaultRules(token: string | null): Promise<VaultRuleSnapshot[]> {
  if (!token) return [];
  try {
    const res = await fetch(`${apiBaseUrl()}/vault`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { rules?: VaultRuleSnapshot[] };
    return (data.rules ?? []).filter((r) => r.enabled);
  } catch {
    return [];
  }
}

export function getSessionCapConfig(rules: VaultRuleSnapshot[]): SessionCapConfig {
  const cap = rules.find((r) => r.ruleType === 'session_cap' && r.enabled);
  return normalizeSessionCapConfig(cap?.config ?? {});
}

export function sessionCapDurationMs(rules: VaultRuleSnapshot[]): number {
  return getSessionCapConfig(rules).durationMinutes * 60 * 1000;
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
