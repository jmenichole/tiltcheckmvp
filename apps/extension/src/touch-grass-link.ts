import { webBaseUrl } from './config.js';

export type TouchGrassReason = 'tilt' | 'pledge' | 'game' | 'manual';

export function touchGrassUrl(
  reason: TouchGrassReason,
  extra?: { until?: string; note?: string },
): string {
  const base = webBaseUrl().replace(/\/$/, '');
  const u = new URL(`${base}/touch-grass`);
  u.searchParams.set('reason', reason);
  if (extra?.until) u.searchParams.set('until', extra.until);
  if (extra?.note) u.searchParams.set('note', extra.note.slice(0, 140));
  return u.toString();
}

/** Open break hub in a new tab — used during lockouts so the casino tab stays on the timer overlay. */
export function openTouchGrassHub(
  reason: TouchGrassReason,
  extra?: { until?: string; note?: string },
): void {
  const url = touchGrassUrl(reason, extra);
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    /* popup blocked — overlay still shows in-tab CTA */
  }
}
