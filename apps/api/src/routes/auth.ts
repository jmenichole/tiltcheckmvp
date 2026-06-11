import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import {
  findUserByDiscordId,
  findUserById,
  upsertUserFromDiscord,
} from '@tiltcheck/db';
import { parseCookies, sessionCookieName, signSession, verifySession } from '../session.js';

const pendingStates = new Map<string, { createdAt: number; source: 'web' | 'ext'; redirect?: string }>();
const STATE_TTL_MS = 10 * 60 * 1000;

function discordConfig() {
  return {
    clientId: process.env.DISCORD_CLIENT_ID ?? '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
    redirectUri: process.env.DISCORD_REDIRECT_URI_WEB ?? `${process.env.API_URL ?? 'http://localhost:3001'}/auth/discord/callback`,
  };
}

function webUrl(): string {
  return (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function apiUrl(): string {
  return (process.env.API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
}

export const authRoutes = new Hono();

authRoutes.get('/discord/login', (c) => {
  const source = c.req.query('source') === 'ext' ? 'ext' : 'web';
  const redirect = c.req.query('redirect') ?? undefined;
  const state = `${source}_${crypto.randomUUID()}`;
  pendingStates.set(state, { createdAt: Date.now(), source, redirect });
  const { clientId, redirectUri } = discordConfig();
  if (!clientId) {
    return c.text('Discord OAuth not configured', 503);
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
    state,
  });
  return c.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

authRoutes.get('/discord/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state') ?? '';
  const error = c.req.query('error');
  if (error) {
    return c.html(`<p>Discord auth error: ${error}</p>`);
  }
  const entry = pendingStates.get(state);
  pendingStates.delete(state);
  if (!entry || Date.now() - entry.createdAt > STATE_TTL_MS) {
    return c.text('Invalid or expired OAuth state', 400);
  }
  if (!code) {
    return c.text('Missing code', 400);
  }
  const { clientId, clientSecret, redirectUri } = discordConfig();
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) {
    return c.text('Token exchange failed', 502);
  }
  const tokenJson = (await tokenRes.json()) as { access_token: string };
  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userRes.ok) {
    return c.text('Failed to load Discord profile', 502);
  }
  const discordUser = (await userRes.json()) as {
    id: string;
    username: string;
    avatar: string | null;
    email?: string;
  };
  const user = await upsertUserFromDiscord({
    discordId: discordUser.id,
    username: discordUser.username,
    avatarUrl: discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null,
    email: discordUser.email ?? null,
  });
  const token = await signSession(user);
  setCookie(c, sessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  if (entry.source === 'ext') {
    const safeToken = JSON.stringify(token);
    const safeUser = JSON.stringify(user.username);
    return c.html(`<!DOCTYPE html><html><body><script>
      (function () {
        var payload = {
          type: 'discord-auth-success',
          token: ${safeToken},
          username: ${safeUser}
        };
        try {
          window.postMessage(payload, window.location.origin);
        } catch (e) {}
        setTimeout(function () { window.close(); }, 500);
      })();
    </script><p>Connected. You can close this window.</p></body></html>`);
  }
  const redirectPath = entry.redirect?.startsWith('/') ? entry.redirect : '/dashboard';
  const handoff = new URL('/api/auth/complete', webUrl());
  handoff.searchParams.set('token', token);
  handoff.searchParams.set('redirect', redirectPath);
  return c.redirect(handoff.toString());
});

authRoutes.get('/me', async (c) => {
  const bearer = c.req.header('authorization');
  const cookies = parseCookies(c.req.header('cookie'));
  const token =
    (bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined) ??
    cookies[sessionCookieName()] ??
    getCookie(c, sessionCookieName());
  if (!token) {
    return c.json({ user: null }, 401);
  }
  const session = await verifySession(token);
  if (!session) {
    return c.json({ user: null }, 401);
  }
  const user = await findUserById(session.userId);
  return c.json({ user });
});

authRoutes.post('/logout', (c) => {
  deleteCookie(c, sessionCookieName(), { path: '/' });
  return c.json({ ok: true });
});

export async function getAuthUserFromRequest(
  cookieHeader: string | undefined,
  authorization?: string,
) {
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  const cookies = parseCookies(cookieHeader);
  const token = bearer ?? cookies[sessionCookieName()];
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  return findUserById(session.userId);
}

export { findUserByDiscordId };
