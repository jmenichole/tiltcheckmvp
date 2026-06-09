import type { ExclusionSuggestion, TiltLearnedStore, TiltPatternType } from '@tiltcheck/shared';
import {
  emptyTiltLearnedStore,
  rankExclusionSuggestions,
  recordTiltLearnEvent,
} from '@tiltcheck/shared';
import type { GameExclusionEntry } from '@tiltcheck/shared';
import type { TiltIndicator } from './tilt-detector.js';
import { buildGameHaystack } from './game-exclusion-watcher.js';

const LEARNED_KEY = 'tc_tilt_learned';
const DISMISSED_KEY = 'tc_tilt_suggestion_dismissed';
const SUGGESTION_COOLDOWN_MS = 6 * 60 * 60 * 1000;

let memoryStore: TiltLearnedStore | null = null;
let loadPromise: Promise<TiltLearnedStore> | null = null;
let lastRecordAt = 0;
const LEARN_COOLDOWN_MS = 8_000;

function severityRank(severity: TiltIndicator['severity']): number {
  if (severity === 'critical') return 3;
  if (severity === 'high') return 2;
  if (severity === 'medium') return 1;
  return 0;
}

function patternTypesFromIndicators(indicators: TiltIndicator[]): TiltPatternType[] {
  const types = new Set<TiltPatternType>();
  for (const ind of indicators) {
    if (ind.type === 'fast_clicks') types.add('fast_clicks');
    if (ind.type === 'chasing_losses') types.add('chasing_losses');
  }
  return [...types];
}

async function loadStore(): Promise<TiltLearnedStore> {
  if (memoryStore) return memoryStore;
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve) => {
    chrome.storage.local.get([LEARNED_KEY], (stored) => {
      const raw = stored[LEARNED_KEY] as TiltLearnedStore | undefined;
      memoryStore = raw?.presets ? raw : emptyTiltLearnedStore();
      loadPromise = null;
      resolve(memoryStore!);
    });
  });
  return loadPromise;
}

async function saveStore(store: TiltLearnedStore): Promise<void> {
  memoryStore = store;
  await chrome.storage.local.set({ [LEARNED_KEY]: store });
}

async function getDismissedLabels(): Promise<Set<string>> {
  return new Promise((resolve) => {
    chrome.storage.local.get([DISMISSED_KEY], (stored) => {
      const raw = stored[DISMISSED_KEY] as { label: string; at: number }[] | undefined;
      const now = Date.now();
      const active = (raw ?? []).filter((d) => now - d.at < SUGGESTION_COOLDOWN_MS);
      resolve(new Set(active.map((d) => d.label)));
    });
  });
}

export async function dismissExclusionSuggestion(label: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get([DISMISSED_KEY], (stored) => {
      const raw = (stored[DISMISSED_KEY] as { label: string; at: number }[] | undefined) ?? [];
      const now = Date.now();
      const next = [...raw.filter((d) => d.label !== label), { label, at: now }];
      chrome.storage.local.set({ [DISMISSED_KEY]: next }, () => resolve());
    });
  });
}

export async function observeTiltPatterns(
  indicators: TiltIndicator[],
  gameExclusions: GameExclusionEntry[],
): Promise<ExclusionSuggestion | null> {
  const relevant = indicators.filter((i) => severityRank(i.severity) >= 1);
  const patternTypes = patternTypesFromIndicators(relevant);
  if (patternTypes.length === 0) return null;

  let store = await loadStore();
  const now = Date.now();
  if (now - lastRecordAt >= LEARN_COOLDOWN_MS) {
    store = recordTiltLearnEvent(store, {
      patternTypes,
      haystack: buildGameHaystack(),
    });
    await saveStore(store);
    lastRecordAt = now;
  }

  const dismissed = await getDismissedLabels();
  const ranked = rankExclusionSuggestions(store, gameExclusions);
  const top = ranked.find((s) => !dismissed.has(s.label)) ?? null;
  return top;
}
