import { Hono } from 'hono';
import { getCasinoScores } from '@tiltcheck/db';
import { CASINOS, casinoMatchesQuery, findLiveTrustScore } from '@tiltcheck/trust';
import { loadDomainBlacklist } from '../lib/domain-blacklist.js';
import { scanDomain } from '../lib/domain-scan.js';
import { parseEmailIntel } from '../lib/email-parser.js';
import {
  getEmailBonusFeedPath,
  persistEmailBonusIntel,
} from '../lib/email-bonus-feed.js';
import { saveBonusFeed } from '../lib/bonus-feed-store.js';
import {
  assertEmailIngestSecret,
  evaluateEmailIngestSenderPolicy,
  extractQuickSenderDomain,
  getEmailIngestAllowDomains,
  getEmailIngestDenyDomains,
  getEmailIngestMaxBytes,
  isSenderDomainDenied,
  logEmailIngestEvent,
  mergeSenderDomainsForPolicy,
} from '../lib/email-ingest-controls.js';

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

trustRoutes.post('/email-ingest', async (c) => {
  if (!assertEmailIngestSecret(c)) {
    logEmailIngestEvent('auth_failed', { code: 'EMAIL_INGEST_AUTH_FAILED' });
    return c.json({ error: 'Email intake authentication required', code: 'EMAIL_INGEST_AUTH_FAILED' }, 401);
  }

  let body: { raw_email?: string };
  try {
    body = await c.req.json<{ raw_email?: string }>();
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'INVALID_INPUT' }, 400);
  }

  const rawEmail = body.raw_email?.trim() ?? '';
  if (rawEmail.length < 20) {
    return c.json({ error: 'raw_email is required (min 20 chars)', code: 'INVALID_INPUT' }, 400);
  }

  const maxBytes = getEmailIngestMaxBytes();
  if (Buffer.byteLength(rawEmail, 'utf8') > maxBytes) {
    return c.json({ error: 'raw_email exceeds maximum size', code: 'PAYLOAD_TOO_LARGE' }, 413);
  }

  const deny = getEmailIngestDenyDomains();
  const allow = getEmailIngestAllowDomains();
  const quickDomain = extractQuickSenderDomain(rawEmail);
  if (quickDomain && isSenderDomainDenied(quickDomain, deny)) {
    return c.json({ error: 'Sender domain is not permitted', code: 'SENDER_NOT_ALLOWED' }, 403);
  }

  let intel;
  try {
    intel = parseEmailIntel(rawEmail);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logEmailIngestEvent('parse_failed', { code: 'EMAIL_PARSE_FAILED', message });
    return c.json({ error: 'Email parse failed', code: 'EMAIL_PARSE_FAILED' }, 422);
  }

  const policyDomains = mergeSenderDomainsForPolicy(intel.senderDomain, quickDomain);
  const policy = evaluateEmailIngestSenderPolicy(policyDomains, deny, allow);
  if (policy !== 'ok') {
    return c.json({ error: 'Sender domain is not permitted', code: 'SENDER_NOT_ALLOWED' }, 403);
  }

  const persisted = persistEmailBonusIntel(rawEmail, intel, new Date());
  await saveBonusFeed(persisted.feed);

  return c.json({
    success: true,
    intel: {
      senderDomain: intel.senderDomain,
      casinoBrand: intel.casinoBrand,
      subject: intel.subject,
      bonusSignals: intel.bonusSignals,
    },
    bonusFeed: {
      file: getEmailBonusFeedPath(),
      detected: persisted.entries.length,
      added: persisted.added.length,
      updated: persisted.updated.length,
    },
  });
});
