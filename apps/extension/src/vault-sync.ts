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
