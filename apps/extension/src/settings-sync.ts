import { apiBaseUrl } from './config.js';
import type { GameExclusionEntry } from '@tiltcheck/shared';

export type SyncedSettings = {
  riskProfile: 'conservative' | 'moderate' | 'degen';
  gameExclusions: GameExclusionEntry[];
  demoMode: boolean;
  notificationsEnabled: boolean;
};

function normalizeSettings(raw: Partial<SyncedSettings> | undefined | null): SyncedSettings | null {
  if (!raw) return null;
  return {
    riskProfile: raw.riskProfile ?? 'moderate',
    gameExclusions: Array.isArray(raw.gameExclusions) ? raw.gameExclusions : [],
    demoMode: Boolean(raw.demoMode),
    notificationsEnabled: raw.notificationsEnabled !== false,
  };
}

export async function applySettingsToStorage(settings: SyncedSettings): Promise<void> {
  await chrome.storage.local.set({
    tc_risk_profile: settings.riskProfile,
    tc_game_exclusions: settings.gameExclusions,
    tc_demo: settings.demoMode,
    tc_notifications_enabled: settings.notificationsEnabled,
  });
}

export async function syncSettingsToStorage(token: string | null): Promise<SyncedSettings | null> {
  if (!token) return null;
  try {
    const res = await fetch(`${apiBaseUrl()}/user/settings`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { settings?: SyncedSettings };
    const settings = normalizeSettings(data.settings);
    if (!settings) return null;

    await applySettingsToStorage(settings);
    return settings;
  } catch {
    return null;
  }
}

