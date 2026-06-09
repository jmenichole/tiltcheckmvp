import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ApiUser, GameExclusionEntry, UserSettings, VaultRule } from '@tiltcheck/shared';

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

function defaultUserSettings(userId: string): UserSettings {
  return {
    userId,
    riskProfile: 'moderate',
    notificationsEnabled: true,
    demoMode: false,
    gameExclusions: [],
    onboardingCompletedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const db = getSupabaseAdmin();
  if (!db) {
    return defaultUserSettings(userId);
  }
  const { data } = await db.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
  if (!data) return defaultUserSettings(userId);
  return mapUserSettingsRow(data);
}

function mapUserSettingsRow(data: Record<string, unknown>): UserSettings {
  return {
    userId: String(data.user_id),
    riskProfile: data.risk_profile as UserSettings['riskProfile'],
    notificationsEnabled: Boolean(data.notifications_enabled),
    demoMode: Boolean(data.demo_mode),
    gameExclusions: parseGameExclusions(data.game_exclusions),
    onboardingCompletedAt: data.onboarding_completed_at
      ? String(data.onboarding_completed_at)
      : null,
    updatedAt: String(data.updated_at),
  };
}

function parseGameExclusions(raw: unknown): GameExclusionEntry[] {
  let parsed: unknown = raw;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  const entries: GameExclusionEntry[] = [];
  for (const rawEntry of parsed) {
    if (!rawEntry || typeof rawEntry !== 'object') continue;
    const entry = rawEntry as Record<string, unknown>;
    const label = typeof entry.label === 'string' ? entry.label.trim() : '';
    const matchPatterns = Array.isArray(entry.matchPatterns)
      ? entry.matchPatterns
          .filter((pattern): pattern is string => typeof pattern === 'string')
          .map((pattern) => pattern.trim().toLowerCase())
          .filter((pattern) => pattern.length >= 2)
      : [];
    if (!label || matchPatterns.length === 0) continue;

    const id =
      typeof entry.id === 'string' && entry.id.length > 0
        ? entry.id
        : `ex-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    entries.push({
      id,
      label,
      matchPatterns,
      mode: entry.mode === 'warn' ? 'warn' : 'block',
      source:
        entry.source === 'preset' || entry.source === 'url' || entry.source === 'keywords'
          ? entry.source
          : 'keywords',
    });
  }
  return entries;
}

export type UserSettingsPatch = Partial<
  Pick<
    UserSettings,
    'riskProfile' | 'notificationsEnabled' | 'demoMode' | 'gameExclusions' | 'onboardingCompletedAt'
  >
>;

export async function upsertUserSettings(userId: string, patch: UserSettingsPatch): Promise<UserSettings> {
  const db = getSupabaseAdmin();
  const existing = await getUserSettings(userId);
  const merged: UserSettings = {
    userId,
    riskProfile: patch.riskProfile ?? existing?.riskProfile ?? 'moderate',
    notificationsEnabled: patch.notificationsEnabled ?? existing?.notificationsEnabled ?? true,
    demoMode: patch.demoMode ?? existing?.demoMode ?? false,
    gameExclusions: patch.gameExclusions ?? existing?.gameExclusions ?? [],
    onboardingCompletedAt:
      patch.onboardingCompletedAt !== undefined
        ? patch.onboardingCompletedAt
        : (existing?.onboardingCompletedAt ?? null),
    updatedAt: new Date().toISOString(),
  };

  if (!db) {
    return merged;
  }

  const row = {
    user_id: userId,
    risk_profile: merged.riskProfile,
    notifications_enabled: merged.notificationsEnabled,
    demo_mode: merged.demoMode,
    game_exclusions: merged.gameExclusions,
    onboarding_completed_at: merged.onboardingCompletedAt,
    updated_at: merged.updatedAt,
  };

  const { data, error } = await db
    .from('user_settings')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('Failed to upsert settings');
  return mapUserSettingsRow(data);
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
