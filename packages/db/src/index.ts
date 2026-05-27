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

export async function listVaultRules(userId: string): Promise<VaultRule[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data } = await db.from('vault_rules').select('*').eq('user_id', userId);
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    ruleType: row.rule_type,
    enabled: row.enabled,
    config: row.config ?? {},
    updatedAt: row.updated_at,
  }));
}

export async function getCasinoScores(): Promise<
  Array<{ casinoName: string; currentScore: number; riskLevel: string; events24h: number; updatedAt?: string }>
> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data } = await db.from('casino_scores').select('*');
  return (data ?? []).map((row) => ({
    casinoName: row.casino_name,
    currentScore: row.current_score,
    riskLevel: row.risk_level,
    events24h: row.events_24h ?? 0,
    updatedAt: row.updated_at,
  }));
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
