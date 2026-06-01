import { Hono } from 'hono';
import { getCasinoScores } from '@tiltcheck/db';
import { CASINOS, findLiveTrustScore } from '@tiltcheck/trust';

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
