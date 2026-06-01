/**
 * Seed Supabase casino_scores from packages/trust static catalog.
 * Usage: pnpm seed:casino-scores
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import { CASINOS } from '@tiltcheck/trust';
import { upsertCasinoScores } from '@tiltcheck/db';

async function main() {
  const count = await upsertCasinoScores(
    CASINOS.map((casino) => ({
      casinoName: casino.name,
      currentScore: casino.score,
      riskLevel: casino.risk,
      events24h: 0,
    })),
  );
  console.log(`Seeded ${count} casino_scores rows from packages/trust.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
