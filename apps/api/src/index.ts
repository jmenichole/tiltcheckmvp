import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/user.js';
import { vaultRoutes } from './routes/vault.js';
import { trustRoutes } from './routes/trust.js';
import { toolsRoutes } from './routes/tools.js';

const app = new Hono();

const webOrigin = process.env.WEB_URL ?? 'http://localhost:3000';

app.use(
  '*',
  cors({
    origin: [webOrigin, 'chrome-extension://*'],
    credentials: true,
  }),
);

app.get('/health', (c) => c.json({ ok: true, service: 'tiltcheck-api' }));

app.route('/auth', authRoutes);
app.route('/user', userRoutes);
app.route('/vault', vaultRoutes);
app.route('/rgaas', trustRoutes);
app.route('/tools', toolsRoutes);

const port = Number(process.env.PORT ?? 3001);
console.log(`TiltCheck API listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
