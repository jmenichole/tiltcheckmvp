import { Hono } from 'hono';
import { getCasinoScores } from '@tiltcheck/db';
import { CASINOS, findLiveTrustScore } from '@tiltcheck/trust';

export const trustRoutes = new Hono();

trustRoutes.get('/casino-scores', async (c) => {
  const live = await getCasinoScores();
  if (live.length > 0) {
    return c.json({ source: 'supabase', casinos: live });
  }
  const fallback = CASINOS.slice(0, 24).map((casino) => ({
    casinoName: casino.name,
    currentScore: casino.score,
    riskLevel: casino.risk,
    events24h: 0,
    updatedAt: new Date().toISOString(),
  }));
  return c.json({ source: 'static-fallback', casinos: fallback });
});

trustRoutes.get('/casino-scores/merge-check', (c) => {
  const sample = CASINOS[0];
  return c.json({ sample: sample ? findLiveTrustScore(sample, []) : null });
});
