import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ApiUser, UserSettings, VaultRule } from '@tiltcheck/shared';

export type { ApiUser, UserSettings, VaultRule };

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!adminClient) {
    adminClient = createClient(url, key, { auth: { persistSession: false } });
  }
  return adminClient;
}

export async function findUserByDiscordId(discordId: string): Promise<ApiUser | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data } = await db.from('users').select('*').eq('discord_id', discordId).maybeSingle();
  if (!data) return null;
  return mapUser(data);
}

export async function findUserById(id: string): Promise<ApiUser | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data } = await db.from('users').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  return mapUser(data);
}

export async function upsertUserFromDiscord(input: {
  discordId: string;
  username: string;
  avatarUrl: string | null;
  email: string | null;
}): Promise<ApiUser> {
  const db = getSupabaseAdmin();
  if (!db) {
    return {
      id: `demo-${input.discordId}`,
      discordId: input.discordId,
      username: input.username,
      avatarUrl: input.avatarUrl,
      email: input.email,
    };
  }
  const { data, error } = await db
    .from('users')
    .upsert(
      {
        discord_id: input.discordId,
        username: input.username,
        avatar_url: input.avatarUrl,
        email: input.email,
      },
      { onConflict: 'discord_id' },
    )
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('Failed to upsert user');
  return mapUser(data);
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const db = getSupabaseAdmin();
  if (!db) {
    return {
      userId,
      riskProfile: 'moderate',
      notificationsEnabled: true,
      demoMode: false,
      updatedAt: new Date().toISOString(),
    };
  }
  const { data } = await db.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
  if (!data) return null;
  return {
    userId: data.user_id,
    riskProfile: data.risk_profile,
    notificationsEnabled: data.notifications_enabled,
    demoMode: data.demo_mode,
    updatedAt: data.updated_at,
  };
}

export async function upsertUserSettings(
  userId: string,
  patch: Partial<Pick<UserSettings, 'riskProfile' | 'notificationsEnabled' | 'demoMode'>>,
): Promise<UserSettings> {
  const db = getSupabaseAdmin();
  const defaults = {
    risk_profile: patch.riskProfile ?? 'moderate',
    notifications_enabled: patch.notificationsEnabled ?? true,
    demo_mode: patch.demoMode ?? false,
  };
  if (!db) {
    return {
      userId,
      riskProfile: defaults.risk_profile,
      notificationsEnabled: defaults.notifications_enabled,
      demoMode: defaults.demo_mode,
      updatedAt: new Date().toISOString(),
    };
  }
  const { data, error } = await db
    .from('user_settings')
    .upsert({ user_id: userId, ...defaults }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('Failed to upsert settings');
  return {
    userId: data.user_id,
    riskProfile: data.risk_profile,
    notificationsEnabled: data.notifications_enabled,
    demoMode: data.demo_mode,
    updatedAt: data.updated_at,
  };
}

const memoryVaultRules = new Map<string, VaultRule[]>();

function mapVaultRow(row: Record<string, unknown>): VaultRule {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    ruleType: String(row.rule_type),
    enabled: Boolean(row.enabled),
    config: (row.config as Record<string, unknown>) ?? {},
    updatedAt: String(row.updated_at),
  };
}

export async function listVaultRules(userId: string): Promise<VaultRule[]> {
  const db = getSupabaseAdmin();
  if (!db) return memoryVaultRules.get(userId) ?? [];
  const { data } = await db.from('vault_rules').select('*').eq('user_id', userId);
  return (data ?? []).map((row) => mapVaultRow(row));
}

export async function createVaultRule(
  userId: string,
  input: { ruleType: string; enabled?: boolean; config?: Record<string, unknown> },
): Promise<VaultRule> {
  const now = new Date().toISOString();
  const db = getSupabaseAdmin();
  if (!db) {
    const rule: VaultRule = {
      id: crypto.randomUUID(),
      userId,
      ruleType: input.ruleType,
      enabled: input.enabled ?? true,
      config: input.config ?? {},
      updatedAt: now,
    };
    const list = memoryVaultRules.get(userId) ?? [];
    list.push(rule);
    memoryVaultRules.set(userId, list);
    return rule;
  }
  const { data, error } = await db
    .from('vault_rules')
    .insert({
      user_id: userId,
      rule_type: input.ruleType,
      enabled: input.enabled ?? true,
      config: input.config ?? {},
    })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('Failed to create vault rule');
  return mapVaultRow(data);
}

export async function updateVaultRule(
  userId: string,
  ruleId: string,
  patch: Partial<{ enabled: boolean; config: Record<string, unknown>; ruleType: string }>,
): Promise<VaultRule | null> {
  const db = getSupabaseAdmin();
  if (!db) {
    const list = memoryVaultRules.get(userId) ?? [];
    const idx = list.findIndex((r) => r.id === ruleId);
    if (idx < 0) return null;
    const updated: VaultRule = {
      ...list[idx],
      ...patch,
      config: patch.config ?? list[idx].config,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    memoryVaultRules.set(userId, list);
    return updated;
  }
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.enabled !== undefined) payload.enabled = patch.enabled;
  if (patch.config !== undefined) payload.config = patch.config;
  if (patch.ruleType !== undefined) payload.rule_type = patch.ruleType;
  const { data, error } = await db
    .from('vault_rules')
    .update(payload)
    .eq('id', ruleId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data ? mapVaultRow(data) : null;
}

export async function deleteVaultRule(userId: string, ruleId: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) {
    const list = memoryVaultRules.get(userId) ?? [];
    const next = list.filter((r) => r.id !== ruleId);
    memoryVaultRules.set(userId, next);
    return next.length !== list.length;
  }
  const { error } = await db.from('vault_rules').delete().eq('id', ruleId).eq('user_id', userId);
  if (error) throw error;
  return true;
}

export async function getCasinoScores(): Promise<
  Array<{ casinoName: string; currentScore: number; riskLevel: string; events24h: number; updatedAt?: string }>
> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data } = await db.from('casino_scores').select('*');
  return (data ?? []).map((row) => ({
    casinoName: row.casino_name,
    currentScore: Number(row.current_score),
    riskLevel: row.risk_level,
    events24h: row.events_24h ?? 0,
    updatedAt: row.updated_at,
  }));
}

export async function upsertCasinoScores(
  rows: Array<{
    casinoName: string;
    currentScore: number;
    riskLevel: string;
    events24h?: number;
  }>,
): Promise<number> {
  const db = getSupabaseAdmin();
  if (!db) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to seed casino_scores');
  }
  const payload = rows.map((row) => ({
    casino_name: row.casinoName,
    current_score: row.currentScore,
    risk_level: row.riskLevel,
    events_24h: row.events24h ?? 0,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await db.from('casino_scores').upsert(payload, { onConflict: 'casino_name' });
  if (error) throw error;
  return payload.length;
}

function mapUser(row: Record<string, unknown>): ApiUser {
  return {
    id: String(row.id),
    discordId: String(row.discord_id),
    username: String(row.username),
    avatarUrl: (row.avatar_url as string | null) ?? null,
    email: (row.email as string | null) ?? null,
  };
}
