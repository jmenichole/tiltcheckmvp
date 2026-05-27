import { Hono } from 'hono';

export const toolsRoutes = new Hono();

toolsRoutes.post('/domain-verifier', async (c) => {
  const body = await c.req.json<{ domain?: string }>();
  const domain = (body.domain ?? '').trim().toLowerCase();
  if (!domain) {
    return c.json({ error: 'domain required' }, 400);
  }
  return c.json({
    domain,
    status: 'stub',
    license: null,
    warnings: ['MVP stub — wire full verifier before production cutover'],
  });
});

toolsRoutes.post('/scan-scams', async (c) => {
  const body = await c.req.json<{ query?: string }>();
  const query = (body.query ?? '').trim().toLowerCase();
  return c.json({
    query,
    matches: query ? [{ name: 'Example Scam Casino', reason: 'Community blacklist stub' }] : [],
    source: 'stub',
  });
});
