import { Hono } from 'hono';
import { getUserSettings, upsertUserSettings } from '@tiltcheck/db';
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
  const settings = await upsertUserSettings(user.id, {
    riskProfile: body.riskProfile,
    notificationsEnabled: body.notificationsEnabled,
    demoMode: body.demoMode,
  });
  return c.json({ settings });
});
