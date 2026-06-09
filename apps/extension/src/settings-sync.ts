import {
  presetToExclusionEntry,
  type GameExclusionEntry,
  type GameExclusionMode,
} from '@tiltcheck/shared';
import { apiBaseUrl } from './config.js';

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

export async function fetchUserSettings(token: string): Promise<SyncedSettings | null> {
  try {
    const res = await fetch(`${apiBaseUrl()}/user/settings`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { settings?: SyncedSettings };
    return normalizeSettings(data.settings);
  } catch {
    return null;
  }
}

export async function pushSettingsToApi(
  token: string,
  patch: Partial<Pick<SyncedSettings, 'gameExclusions' | 'riskProfile' | 'demoMode'>>,
): Promise<{ ok: true; settings: SyncedSettings } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${apiBaseUrl()}/user/settings`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: err?.error ?? `Save failed (${res.status})` };
    }
    const data = (await res.json()) as { settings?: SyncedSettings };
    const settings = normalizeSettings(data.settings);
    if (!settings) return { ok: false, error: 'Invalid settings response' };
    await applySettingsToStorage(settings);
    return { ok: true, settings };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

export async function pushSuggestedGameExclusion(
  token: string,
  label: string,
  mode: GameExclusionMode = 'warn',
): Promise<{ ok: true; gameExclusions: GameExclusionEntry[] } | { ok: false; error: string }> {
  const entry = presetToExclusionEntry(label, mode);
  if (!entry) return { ok: false, error: 'Unknown game preset' };

  const current = await fetchUserSettings(token);
  if (!current) return { ok: false, error: 'Could not load settings' };

  const exists = current.gameExclusions.some(
    (e) => e.source === 'preset' && e.label === label,
  );
  if (exists) {
    await applySettingsToStorage(current);
    return { ok: true, gameExclusions: current.gameExclusions };
  }

  const gameExclusions = [...current.gameExclusions, entry];
  try {
    const res = await fetch(`${apiBaseUrl()}/user/settings`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        riskProfile: current.riskProfile,
        notificationsEnabled: current.notificationsEnabled,
        demoMode: current.demoMode,
        gameExclusions,
      }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: err?.error ?? `Save failed (${res.status})` };
    }
    const data = (await res.json()) as { settings?: SyncedSettings };
    const settings = normalizeSettings(data.settings);
    if (!settings) return { ok: false, error: 'Invalid settings response' };
    await applySettingsToStorage(settings);
    return { ok: true, gameExclusions: settings.gameExclusions };
  } catch {
    return { ok: false, error: 'Network error' };
  }
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

