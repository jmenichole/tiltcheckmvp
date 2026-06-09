import { GAME_EXCLUSION_PRESETS } from './game-exclusion.js';
import type { GameExclusionEntry } from './types.js';

export type TiltPatternType = 'fast_clicks' | 'chasing_losses';

/** When URL/title doesn't match a preset, tilt pattern types hint at likely game categories. */
export const TILT_PATTERN_PRESET_AFFINITY: Record<TiltPatternType, string[]> = {
  fast_clicks: ['Crash / Limbo', 'Slots', 'Roulette'],
  chasing_losses: ['Blackjack', 'Live dealer', 'Baccarat', 'Sports / in-play'],
};

export type TiltLearnedPreset = {
  label: string;
  fastClickHits: number;
  lossChaseHits: number;
  lastSeenAt: number;
};

export type TiltLearnedStore = {
  presets: Record<string, TiltLearnedPreset>;
};

export type ExclusionSuggestion = {
  label: string;
  score: number;
  primaryPattern: TiltPatternType;
  reason: string;
};

export function emptyTiltLearnedStore(): TiltLearnedStore {
  return { presets: {} };
}

export function presetLabelToKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

export function detectPresetLabelsInHaystack(haystack: string): string[] {
  const normalized = haystack.toLowerCase();
  const found: string[] = [];
  for (const preset of GAME_EXCLUSION_PRESETS) {
    for (const pattern of preset.matchPatterns) {
      const p = pattern.toLowerCase().trim();
      if (p.length >= 2 && normalized.includes(p)) {
        found.push(preset.label);
        break;
      }
    }
  }
  return found;
}

export function isPresetExcluded(label: string, exclusions: GameExclusionEntry[]): boolean {
  const preset = GAME_EXCLUSION_PRESETS.find((p) => p.label === label);
  return exclusions.some((e) => {
    if (e.label === label) return true;
    if (e.source === 'preset' && e.label === label) return true;
    if (!preset) return false;
    return preset.matchPatterns.some((pp) =>
      e.matchPatterns.some((ep) => ep.toLowerCase() === pp.toLowerCase()),
    );
  });
}

function ensurePreset(store: TiltLearnedStore, label: string): TiltLearnedPreset {
  const key = presetLabelToKey(label);
  if (!store.presets[key]) {
    store.presets[key] = { label, fastClickHits: 0, lossChaseHits: 0, lastSeenAt: 0 };
  }
  return store.presets[key];
}

export function recordTiltLearnEvent(
  store: TiltLearnedStore,
  input: { patternTypes: TiltPatternType[]; haystack: string },
): TiltLearnedStore {
  const detected = detectPresetLabelsInHaystack(input.haystack);
  const next: TiltLearnedStore = { presets: { ...store.presets } };
  const now = Date.now();

  const bump = (label: string, type: TiltPatternType) => {
    const entry = ensurePreset(next, label);
    if (type === 'fast_clicks') entry.fastClickHits += 1;
    else entry.lossChaseHits += 1;
    entry.lastSeenAt = now;
  };

  if (detected.length > 0) {
    for (const label of detected) {
      for (const pt of input.patternTypes) bump(label, pt);
    }
  } else {
    for (const pt of input.patternTypes) {
      const affinity = TILT_PATTERN_PRESET_AFFINITY[pt];
      if (affinity[0]) bump(affinity[0], pt);
    }
  }

  return next;
}

export function rankExclusionSuggestions(
  store: TiltLearnedStore,
  exclusions: GameExclusionEntry[],
  minScore = 2,
): ExclusionSuggestion[] {
  const out: ExclusionSuggestion[] = [];
  for (const entry of Object.values(store.presets)) {
    if (isPresetExcluded(entry.label, exclusions)) continue;
    const score = entry.fastClickHits + entry.lossChaseHits;
    if (score < minScore) continue;
    const primaryPattern: TiltPatternType =
      entry.lossChaseHits > entry.fastClickHits ? 'chasing_losses' : 'fast_clicks';
    const reason =
      primaryPattern === 'fast_clicks'
        ? `Autopilot clicks spiked ${entry.fastClickHits}× on ${entry.label}`
        : `Loss-chase pattern hit ${entry.lossChaseHits}× on ${entry.label}`;
    out.push({ label: entry.label, score, primaryPattern, reason });
  }
  return out.sort((a, b) => b.score - a.score);
}

export function presetToExclusionEntry(
  label: string,
  mode: 'block' | 'warn' = 'warn',
): GameExclusionEntry | null {
  const preset = GAME_EXCLUSION_PRESETS.find((p) => p.label === label);
  if (!preset) return null;
  return {
    id: crypto.randomUUID(),
    label: preset.label,
    matchPatterns: [...preset.matchPatterns],
    mode,
    source: 'preset',
  };
}
