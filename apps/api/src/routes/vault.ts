import { Hono } from 'hono';
import { normalizeSessionCapConfig } from '@tiltcheck/shared';
import {
  createVaultRule,
  deleteVaultRule,
  listVaultRules,
  updateVaultRule,
} from '@tiltcheck/db';
import { getAuthUserFromRequest } from './auth.js';

export const vaultRoutes = new Hono();

function validateRulePayload(body: {
  ruleType?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}): { ruleType: string; enabled: boolean; config: Record<string, unknown> } | string {
  const ruleType = body.ruleType ?? 'session_cap';
  if (ruleType !== 'session_cap') {
    return 'Only session_cap rules are supported in v2 ship gate';
  }
  return {
    ruleType,
    enabled: body.enabled !== false,
    config: normalizeSessionCapConfig(body.config ?? {}),
  };
}

vaultRoutes.get('/', async (c) => {
  const user = await getAuthUserFromRequest(c.req.header('cookie'), c.req.header('authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const rules = await listVaultRules(user.id);
  return c.json({ rules });
});

vaultRoutes.post('/', async (c) => {
  const user = await getAuthUserFromRequest(c.req.header('cookie'), c.req.header('authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const validated = validateRulePayload(body);
  if (typeof validated === 'string') {
    return c.json({ error: validated }, 400);
  }
  const existing = await listVaultRules(user.id);
  const sameType = existing.find((r) => r.ruleType === validated.ruleType);
  if (sameType) {
    const updated = await updateVaultRule(user.id, sameType.id, {
      enabled: validated.enabled,
      config: validated.config,
    });
    const rules = await listVaultRules(user.id);
    return c.json({ rules, updated: updated?.id ?? sameType.id });
  }
  await createVaultRule(user.id, validated);
  const rules = await listVaultRules(user.id);
  return c.json({ rules }, 201);
});

vaultRoutes.patch('/:id', async (c) => {
  const user = await getAuthUserFromRequest(c.req.header('cookie'), c.req.header('authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json();
  const patch: { enabled?: boolean; config?: Record<string, unknown> } = {};
  if (body.enabled !== undefined) patch.enabled = Boolean(body.enabled);
  if (body.config !== undefined) {
    if (body.ruleType && body.ruleType !== 'session_cap') {
      return c.json({ error: 'Only session_cap rules are supported' }, 400);
    }
    patch.config = normalizeSessionCapConfig(body.config);
  }
  const updated = await updateVaultRule(user.id, id, patch);
  if (!updated) return c.json({ error: 'Rule not found' }, 404);
  const rules = await listVaultRules(user.id);
  return c.json({ rules, updated: updated.id });
});

vaultRoutes.delete('/:id', async (c) => {
  const user = await getAuthUserFromRequest(c.req.header('cookie'), c.req.header('authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const ok = await deleteVaultRule(user.id, id);
  if (!ok) return c.json({ error: 'Rule not found' }, 404);
  const rules = await listVaultRules(user.id);
  return c.json({ rules });
});
