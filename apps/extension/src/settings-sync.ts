import { apiBaseUrl } from './config.js';
import type { GameExclusionEntry } from '@tiltcheck/shared';

export type SyncedSettings = {
  riskProfile: 'conservative' | 'moderate' | 'degen';
  gameExclusions: GameExclusionEntry[];
  demoMode: boolean;
  notificationsEnabled: boolean;
};

export async function syncSettingsToStorage(token: string | null): Promise<SyncedSettings | null> {
  if (!token) return null;
  try {
    const res = await fetch(`${apiBaseUrl()}/user/settings`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { settings?: SyncedSettings };
    if (!data.settings) return null;

    const settings: SyncedSettings = {
      riskProfile: data.settings.riskProfile ?? 'moderate',
      gameExclusions: Array.isArray(data.settings.gameExclusions) ? data.settings.gameExclusions : [],
      demoMode: Boolean(data.settings.demoMode),
      notificationsEnabled: data.settings.notificationsEnabled !== false,
    };

    await chrome.storage.local.set({
      tc_risk_profile: settings.riskProfile,
      tc_game_exclusions: settings.gameExclusions,
      tc_demo: settings.demoMode,
      tc_notifications_enabled: settings.notificationsEnabled,
    });

    return settings;
  } catch {
    return null;
  }
}
