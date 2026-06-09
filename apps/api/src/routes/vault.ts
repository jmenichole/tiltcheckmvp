import { Hono } from 'hono';
import {
  normalizeSessionCapConfig,
  normalizeVaultPledgeConfig,
  autoReleaseIfExpired,
} from '@tiltcheck/shared';
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
  if (ruleType === 'session_cap') {
    return {
      ruleType,
      enabled: body.enabled !== false,
      config: normalizeSessionCapConfig(body.config ?? {}),
    };
  }
  if (ruleType === 'vault_pledge') {
    const normalized = normalizeVaultPledgeConfig(body.config ?? {});
    if (normalized.status === 'active' && Date.parse(normalized.releaseAt) <= Date.now()) {
      return 'releaseAt must be in the future for active pledge';
    }
    return {
      ruleType,
      enabled: body.enabled !== false,
      config: normalized,
    };
  }
  return `Unsupported ruleType: ${ruleType}`;
}

vaultRoutes.get('/', async (c) => {
  const user = await getAuthUserFromRequest(c.req.header('cookie'), c.req.header('authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const rules = (await listVaultRules(user.id)).map((rule) => {
    if (rule.ruleType !== 'vault_pledge') return rule;
    const released = autoReleaseIfExpired(normalizeVaultPledgeConfig(rule.config));
    if (released.status !== rule.config.status) {
      void updateVaultRule(user.id, rule.id, { config: released });
      return { ...rule, config: released };
    }
    return rule;
  });
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
  const existing = await listVaultRules(user.id);
  const rule = existing.find((r) => r.id === id);
  if (!rule) return c.json({ error: 'Rule not found' }, 404);

  const ruleType = body.ruleType ?? rule.ruleType;
  const patch: { enabled?: boolean; config?: Record<string, unknown> } = {};
  if (body.enabled !== undefined) patch.enabled = Boolean(body.enabled);
  if (body.config !== undefined) {
    if (ruleType === 'vault_pledge') {
      patch.config = normalizeVaultPledgeConfig(body.config);
    } else if (ruleType === 'session_cap') {
      patch.config = normalizeSessionCapConfig(body.config);
    } else {
      return c.json({ error: `Unsupported ruleType: ${ruleType}` }, 400);
    }
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
