import { apiBaseUrl } from './config.js';

export interface VaultRuleSnapshot {
  ruleType: string;
  enabled: boolean;
  config: { durationMinutes?: number };
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

export function sessionCapDurationMs(rules: VaultRuleSnapshot[]): number {
  const cap = rules.find((r) => r.ruleType === 'session_cap');
  const minutes = cap?.config?.durationMinutes ?? 5;
  return Math.min(60, Math.max(1, minutes)) * 60 * 1000;
}

export async function pushSessionCapMinutes(
  token: string,
  durationMinutes: number,
): Promise<{ ok: true; rules: VaultRuleSnapshot[] } | { ok: false; error: string }> {
  const minutes = Math.min(60, Math.max(1, Math.trunc(durationMinutes)));
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
        config: { durationMinutes: minutes },
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
