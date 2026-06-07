import { Hono } from 'hono';
import { getCasinoScores } from '@tiltcheck/db';
import { CASINOS, casinoMatchesQuery, findLiveTrustScore } from '@tiltcheck/trust';
import { loadDomainBlacklist } from '../lib/domain-blacklist.js';
import { scanDomain } from '../lib/domain-scan.js';

export const trustRoutes = new Hono();

function staticFallbackScores() {
  const updatedAt = new Date().toISOString();
  return CASINOS.map((casino) => ({
    casinoName: casino.name,
    currentScore: casino.score,
    riskLevel: casino.risk,
    events24h: 0,
    updatedAt,
  }));
}

trustRoutes.get('/casino-scores', async (c) => {
  const live = await getCasinoScores();
  if (live.length > 0) {
    const updatedAt = live.reduce<string | null>((latest, row) => {
      if (!row.updatedAt) return latest;
      if (!latest || row.updatedAt > latest) return row.updatedAt;
      return latest;
    }, null);
    return c.json({
      success: true,
      casinos: live,
      updatedAt: updatedAt ?? new Date().toISOString(),
      source: 'supabase',
    });
  }
  const fallback = staticFallbackScores();
  return c.json({
    success: true,
    casinos: fallback,
    updatedAt: fallback[0]?.updatedAt ?? new Date().toISOString(),
    source: 'static-fallback',
  });
});

trustRoutes.get('/casino-scores/merge-check', (c) => {
  const sample = CASINOS[0];
  return c.json({ sample: sample ? findLiveTrustScore(sample, []) : null });
});

trustRoutes.get('/domain-check', async (c) => {
  const rawDomain = c.req.query('domain')?.trim() ?? '';
  if (!rawDomain) {
    return c.json({ error: 'domain query param is required', code: 'INVALID_DOMAIN' }, 400);
  }

  const blacklist = await loadDomainBlacklist();
  const result = scanDomain(rawDomain, blacklist);
  const safe = result.riskLevel === 'safe';

  return c.json({
    success: true,
    domain: rawDomain,
    safe,
    riskLevel: result.riskLevel,
    message: result.reason,
    result,
    source: 'heuristic',
  });
});

trustRoutes.get('/casino-lookup', async (c) => {
  const query = c.req.query('q')?.trim() ?? '';
  if (!query) {
    return c.json({ error: 'q parameter required' }, 400);
  }

  const casino = CASINOS.find((entry) => casinoMatchesQuery(entry, query));
  if (!casino) {
    return c.json({ casino: null });
  }

  const live = await getCasinoScores();
  const liveScore = findLiveTrustScore(casino, live);
  const score = liveScore?.currentScore ?? casino.score;

  return c.json({
    casino: {
      name: casino.name,
      slug: casino.slug,
      score,
      grade: casino.grade,
      risk: liveScore?.riskLevel ?? casino.risk,
    },
  });
});
