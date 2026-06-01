import { Hono } from 'hono';
import {
  STATIC_BONUS_PICKS,
  picksFromUpstream,
  type BonusPick,
  type UpstreamBonusPayload,
} from '../lib/bonus-fallback.js';

export const bonusesRoutes = new Hono();

function upstreamUrl(limit: number): string {
  const base = (process.env.BONUSES_UPSTREAM_URL ?? 'https://api.tiltcheck.me/bonuses').replace(/\/$/, '');
  const params = new URLSearchParams({
    source: 'inbox',
    sort: 'urgency',
    limit: String(limit),
  });
  return `${base}?${params.toString()}`;
}

async function fetchUpstreamPicks(limit: number): Promise<{
  picks: BonusPick[];
  source: string;
  updatedAt: string | null;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(upstreamUrl(limit), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`upstream ${res.status}`);
    }
    const payload = (await res.json()) as UpstreamBonusPayload;
    const picks = picksFromUpstream(payload, limit);
    if (picks.length === 0) {
      throw new Error('upstream empty');
    }
    return {
      picks,
      source: payload.source ?? 'email-inbox',
      updatedAt: payload.updatedAt ?? null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

bonusesRoutes.get('/', async (c) => {
  const rawLimit = Number(c.req.query('limit') ?? '20');
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1), 100);

  try {
    const upstream = await fetchUpstreamPicks(limit);
    return c.json({
      success: true,
      source: upstream.source,
      updatedAt: upstream.updatedAt,
      limit,
      sort: 'urgency',
      data: upstream.picks,
    });
  } catch {
    return c.json({
      success: true,
      source: 'static-fallback',
      updatedAt: new Date().toISOString(),
      limit,
      sort: 'urgency',
      message: 'Live inbox feed unavailable; showing static examples.',
      data: STATIC_BONUS_PICKS.slice(0, Math.min(limit, STATIC_BONUS_PICKS.length)),
    });
  }
});

bonusesRoutes.get('/picks', async (c) => {
  const rawLimit = Number(c.req.query('limit') ?? '3');
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 3, 1), 10);

  try {
    const upstream = await fetchUpstreamPicks(limit);
    return c.json({
      success: true,
      source: upstream.source,
      updatedAt: upstream.updatedAt,
      limit,
      data: upstream.picks,
    });
  } catch {
    return c.json({
      success: true,
      source: 'static-fallback',
      updatedAt: new Date().toISOString(),
      limit,
      message: 'Live inbox feed unavailable; showing static examples.',
      data: STATIC_BONUS_PICKS.slice(0, limit),
    });
  }
});
