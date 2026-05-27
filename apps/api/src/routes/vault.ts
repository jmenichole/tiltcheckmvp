import { Hono } from 'hono';
import { listVaultRules } from '@tiltcheck/db';
import { getAuthUserFromRequest } from './auth.js';

export const vaultRoutes = new Hono();

vaultRoutes.get('/', async (c) => {
  const user = await getAuthUserFromRequest(c.req.header('cookie'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const rules = await listVaultRules(user.id);
  return c.json({ rules });
});

// TODO(phase-plan): Phase 2 — persist vault rules to Supabase; remove stub response.
vaultRoutes.post('/', async (c) => {
  const user = await getAuthUserFromRequest(c.req.header('cookie'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  // TODO(phase-2): Persist to Supabase vault_rules; remove stub response (blocks staging ship gate).
  return c.json({
    rules: [
      {
        id: crypto.randomUUID(),
        userId: user.id,
        ruleType: body.ruleType ?? 'session_cap',
        enabled: true,
        config: body.config ?? {},
        updatedAt: new Date().toISOString(),
      },
    ],
    stub: true,
  });
});
