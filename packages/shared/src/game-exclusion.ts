import type { GameExclusionEntry, GameExclusionMode, GameExclusionSource } from './types.js';

export const GAME_EXCLUSION_PRESETS: Omit<GameExclusionEntry, 'id' | 'mode'>[] = [
  { label: 'Blackjack', matchPatterns: ['blackjack', 'bj', '21'], source: 'preset' },
  { label: 'Roulette', matchPatterns: ['roulette', 'wheel'], source: 'preset' },
  { label: 'Slots', matchPatterns: ['slot', 'spin', 'reels'], source: 'preset' },
  { label: 'Crash / Limbo', matchPatterns: ['crash', 'limbo', 'aviator'], source: 'preset' },
  { label: 'Live dealer', matchPatterns: ['live casino', 'live dealer', 'live blackjack'], source: 'preset' },
  { label: 'Baccarat', matchPatterns: ['baccarat', 'bacará'], source: 'preset' },
  { label: 'Poker', matchPatterns: ['poker', 'holdem', "hold'em"], source: 'preset' },
  { label: 'Sports / in-play', matchPatterns: ['sportsbook', '/sports/', 'in-play'], source: 'preset' },
];

export const MAX_GAME_EXCLUSIONS = 20;
const MIN_PATTERN_LEN = 2;
const MAX_PATTERN_LEN = 120;
/** Stake category bundles need group + game path prefixes (see stake-categories.ts). */
const MAX_PATTERNS_PER_ENTRY = 16;

export function normalizeHaystack(parts: string[]): string {
  return parts.join(' ').toLowerCase();
}

export function pathnameMatchesPrefix(pathname: string, prefix: string): boolean {
  const p = prefix.toLowerCase();
  const path = pathname.toLowerCase();
  return path === p || path.startsWith(p + '/');
}

export function matchGameExclusionForPage(
  pathname: string,
  haystack: string,
  entries: GameExclusionEntry[],
  options?: { stakeHost?: boolean },
): GameExclusionEntry | null {
  const normalizedHaystack = haystack.toLowerCase();
  const usePathPrefix = options?.stakeHost === true;

  for (const entry of entries) {
    for (const pattern of entry.matchPatterns) {
      const p = pattern.toLowerCase().trim();
      if (p.length < MIN_PATTERN_LEN) continue;

      if (p.startsWith('/')) {
        if (usePathPrefix && pathnameMatchesPrefix(pathname, p)) {
          return entry;
        }
        if (!usePathPrefix && normalizedHaystack.includes(p)) {
          return entry;
        }
      } else if (normalizedHaystack.includes(p)) {
        return entry;
      }
    }
  }
  return null;
}

export function matchGameExclusion(
  haystack: string,
  entries: GameExclusionEntry[],
): GameExclusionEntry | null {
  return matchGameExclusionForPage('', haystack, entries);
}

export function patternsFromGameUrl(rawUrl: string): string[] {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error('Invalid game URL');
  }
  const segments = url.pathname.split('/').filter(Boolean);
  const patterns = new Set<string>();
  if (url.pathname.length >= MIN_PATTERN_LEN) {
    patterns.add(url.pathname.toLowerCase());
  }
  const last = segments.at(-1);
  if (last && last.length >= MIN_PATTERN_LEN) {
    patterns.add(last.toLowerCase());
  }
  if (patterns.size === 0) {
    throw new Error('Could not extract match patterns from URL');
  }
  return [...patterns].slice(0, MAX_PATTERNS_PER_ENTRY);
}

export type GameExclusionValidationError = { field: string; message: string };

export function validateGameExclusions(
  entries: unknown,
): { ok: true; value: GameExclusionEntry[] } | { ok: false; errors: GameExclusionValidationError[] } {
  if (!Array.isArray(entries)) {
    return { ok: false, errors: [{ field: 'gameExclusions', message: 'Must be an array' }] };
  }
  if (entries.length > MAX_GAME_EXCLUSIONS) {
    return {
      ok: false,
      errors: [{ field: 'gameExclusions', message: `Maximum ${MAX_GAME_EXCLUSIONS} entries allowed` }],
    };
  }

  const errors: GameExclusionValidationError[] = [];
  const value: GameExclusionEntry[] = [];

  entries.forEach((raw, index) => {
    const prefix = `gameExclusions[${index}]`;
    const entryErrors: GameExclusionValidationError[] = [];

    if (!raw || typeof raw !== 'object') {
      errors.push({ field: prefix, message: 'Invalid entry' });
      return;
    }
    const entry = raw as Record<string, unknown>;
    const label = typeof entry.label === 'string' ? entry.label.trim() : '';
    if (label.length < 1 || label.length > 80) {
      entryErrors.push({ field: `${prefix}.label`, message: 'Label required (1–80 chars)' });
    }

    const mode = entry.mode as GameExclusionMode;
    if (mode !== 'block' && mode !== 'warn') {
      entryErrors.push({ field: `${prefix}.mode`, message: 'Mode must be block or warn' });
    }

    if (!Array.isArray(entry.matchPatterns) || entry.matchPatterns.length === 0) {
      entryErrors.push({ field: `${prefix}.matchPatterns`, message: 'At least one pattern required' });
    } else if (entry.matchPatterns.length > MAX_PATTERNS_PER_ENTRY) {
      entryErrors.push({
        field: `${prefix}.matchPatterns`,
        message: `Maximum ${MAX_PATTERNS_PER_ENTRY} patterns per entry`,
      });
    }

    const matchPatterns: string[] = [];
    if (Array.isArray(entry.matchPatterns)) {
      for (const p of entry.matchPatterns) {
        if (typeof p !== 'string') {
          entryErrors.push({ field: `${prefix}.matchPatterns`, message: 'Patterns must be strings' });
          continue;
        }
        const trimmed = p.trim().toLowerCase();
        if (trimmed.length < MIN_PATTERN_LEN || trimmed.length > MAX_PATTERN_LEN) {
          entryErrors.push({
            field: `${prefix}.matchPatterns`,
            message: `Each pattern must be ${MIN_PATTERN_LEN}–${MAX_PATTERN_LEN} characters`,
          });
        } else {
          matchPatterns.push(trimmed);
        }
      }
    }

    if (entryErrors.length > 0) {
      errors.push(...entryErrors);
      return;
    }

    const id = typeof entry.id === 'string' && entry.id.length > 0 ? entry.id : crypto.randomUUID();
    const source = (['preset', 'keywords', 'url', 'stake_category'] as GameExclusionSource[]).includes(
      entry.source as GameExclusionSource,
    )
      ? (entry.source as GameExclusionSource)
      : 'keywords';

    value.push({ id, label, matchPatterns, mode, source });
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}
