import { Hono } from 'hono';
import { loadDomainBlacklist } from '../lib/domain-blacklist.js';
import { scanDomain } from '../lib/domain-scan.js';

export const toolsRoutes = new Hono();

toolsRoutes.post('/domain-verifier', async (c) => {
  const body = await c.req.json<{ domain?: string }>();
  const domain = (body.domain ?? '').trim();
  if (!domain) {
    return c.json({ error: 'domain required' }, 400);
  }

  const blacklist = await loadDomainBlacklist();
  const result = scanDomain(domain, blacklist);
  const safe = result.riskLevel === 'safe';

  return c.json({
    success: true,
    domain,
    safe,
    riskLevel: result.riskLevel,
    message: result.reason,
    result,
    source: 'heuristic',
  });
});

toolsRoutes.post('/scan-scams', async (c) => {
  const body = await c.req.json<{ query?: string }>();
  const query = (body.query ?? '').trim().toLowerCase();
  if (!query) {
    return c.json({ query: '', matches: [], source: 'blacklist' });
  }

  const blacklist = await loadDomainBlacklist();
  const matches = blacklist
    .filter((d) => d.includes(query))
    .slice(0, 25)
    .map((name) => ({ name, reason: 'Community scam blacklist' }));

  return c.json({
    query,
    matches,
    source: 'blacklist',
  });
});
