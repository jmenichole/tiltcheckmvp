import { Hono } from 'hono';
import { getUserSettings, upsertUserSettings } from '@tiltcheck/db';
import { validateGameExclusions } from '@tiltcheck/shared';
import { getAuthUserFromRequest } from './auth.js';

export const userRoutes = new Hono();

userRoutes.get('/settings', async (c) => {
  const user = await getAuthUserFromRequest(c.req.header('cookie'), c.req.header('authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const settings = await getUserSettings(user.id);
  return c.json({ settings });
});

userRoutes.patch('/settings', async (c) => {
  const user = await getAuthUserFromRequest(c.req.header('cookie'), c.req.header('authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();

  let gameExclusions;
  if (body.gameExclusions !== undefined) {
    const validated = validateGameExclusions(body.gameExclusions);
    if (!validated.ok) {
      return c.json({ error: 'Validation failed', details: validated.errors }, 400);
    }
    gameExclusions = validated.value;
  }

  let onboardingCompletedAt: string | null | undefined;
  if (body.onboardingCompletedAt !== undefined) {
    if (body.onboardingCompletedAt === null) {
      onboardingCompletedAt = null;
    } else if (typeof body.onboardingCompletedAt === 'string') {
      onboardingCompletedAt = body.onboardingCompletedAt;
    } else {
      return c.json({ error: 'onboardingCompletedAt must be ISO string or null' }, 400);
    }
  }

  const riskProfile = body.riskProfile;
  if (
    riskProfile !== undefined &&
    riskProfile !== 'conservative' &&
    riskProfile !== 'moderate' &&
    riskProfile !== 'degen'
  ) {
    return c.json({ error: 'Invalid riskProfile' }, 400);
  }

  const settings = await upsertUserSettings(user.id, {
    riskProfile: body.riskProfile,
    notificationsEnabled: body.notificationsEnabled,
    demoMode: body.demoMode,
    gameExclusions,
    onboardingCompletedAt,
  });
  return c.json({ settings });
});
