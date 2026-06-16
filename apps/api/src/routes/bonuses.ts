// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-16
import { Hono } from 'hono';
import {
  STATIC_BONUS_PICKS,
  mapUpstreamPick,
  type BonusPick,
  type UpstreamBonusPayload,
} from '../lib/bonus-fallback.js';
import { buildInboxBonusResponse } from '../lib/bonus-inbox.js';
import { buildDailyBonusFeed } from '../lib/daily-bonus-feed.js';

export const bonusesRoutes = new Hono();

function upstreamUrl(limit: number, sort: string): string {
  const base = (process.env.BONUSES_UPSTREAM_URL ?? 'https://api.tiltcheck.me/bonuses').replace(/\/$/, '');
  const params = new URLSearchParams({
    source: 'inbox',
    sort,
    limit: String(limit),
  });
  return `${base}?${params.toString()}`;
}

async function fetchUpstream(limit: number, sort: string): Promise<{
  picks: BonusPick[];
  source: string;
  updatedAt: string | null;
  message?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(upstreamUrl(limit, sort), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const payload = (await res.json()) as UpstreamBonusPayload;
    const rows = Array.isArray(payload.data) ? payload.data : [];
    const picks = rows
      .map((row) => mapUpstreamPick(row))
      .filter((row): row is BonusPick => row !== null)
      .slice(0, limit);
    if (picks.length === 0) throw new Error('upstream empty');
    return {
      picks,
      source: payload.source ?? 'email-inbox',
      updatedAt: payload.updatedAt ?? null,
      message: typeof payload.message === 'string' ? payload.message : undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveInbox(limit: number, sort: string) {
  const local = await buildInboxBonusResponse({ limit: String(limit), sort, source: 'inbox' });
  if (local.data.length > 0) {
    return {
      picks: local.data.map((entry) => ({
        id: entry.id,
        casinoName: entry.casinoName,
        offerTitle: entry.offerTitle,
        url: entry.url,
        expiresAt: entry.expiresAt,
        expiryMessage: entry.expiryMessage,
        expiresSoon: entry.expiresSoon,
        urgent: entry.urgent,
        source: 'email-inbox' as const,
        code: entry.code,
        verified: entry.verified,
        imageUrl: entry.imageUrl,
      })),
      source: local.source,
      updatedAt: local.updatedAt,
      total: local.total,
      message: local.message,
    };
  }

  try {
    const upstream = await fetchUpstream(limit, sort);
    return { ...upstream, total: upstream.picks.length };
  } catch {
    return null;
  }
}

bonusesRoutes.get('/', async (c) => {
  const rawLimit = Number(c.req.query('limit') ?? '50');
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 100);
  const sort = c.req.query('sort') === 'verified' ? 'verified' : 'urgency';

  const resolved = await resolveInbox(limit, sort);
  if (resolved) {
    return c.json({
      success: true,
      source: resolved.source,
      updatedAt: resolved.updatedAt,
      limit,
      sort,
      total: resolved.total,
      available: resolved.picks.length > 0,
      message: resolved.message,
      data: resolved.picks,
    });
  }

  return c.json({
    success: true,
    source: 'static-fallback',
    updatedAt: new Date().toISOString(),
    limit,
    sort,
    total: STATIC_BONUS_PICKS.length,
    available: true,
    message: 'Live inbox feed unavailable; showing static examples.',
    data: STATIC_BONUS_PICKS.slice(0, Math.min(limit, STATIC_BONUS_PICKS.length)),
  });
});

bonusesRoutes.get('/inbox', async (c) => {
  const rawLimit = Number(c.req.query('limit') ?? '50');
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 100);
  const sort = c.req.query('sort') === 'verified' ? 'verified' : 'urgency';
  const inbox = await buildInboxBonusResponse({
    limit: String(limit),
    sort,
    source: 'inbox',
  });
  return c.json({ success: true, ...inbox });
});

bonusesRoutes.get('/daily-feed', async (c) => {
  try {
    const usOnly = c.req.query('usOnly') !== 'false';
    const feed = await buildDailyBonusFeed({ usOnly });
    return c.json({
      success: true,
      ...feed,
    });
  } catch (error) {
    console.error('[Bonuses] Failed to build daily bonus feed:', error);
    return c.json(
      {
        success: false,
        error: 'DAILY_FEED_BUILD_FAILED',
        message: 'Could not build unified daily bonus feed.',
      },
      500,
    );
  }
});

bonusesRoutes.get('/picks', async (c) => {
  const rawLimit = Number(c.req.query('limit') ?? '3');
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 3, 1), 10);
  const resolved = await resolveInbox(limit, 'urgency');
  if (resolved) {
    return c.json({
      success: true,
      source: resolved.source,
      updatedAt: resolved.updatedAt,
      limit,
      message: resolved.message,
      data: resolved.picks.slice(0, limit),
    });
  }
  return c.json({
    success: true,
    source: 'static-fallback',
    updatedAt: new Date().toISOString(),
    limit,
    message: 'Live inbox feed unavailable; showing static examples.',
    data: STATIC_BONUS_PICKS.slice(0, limit),
  });
});
