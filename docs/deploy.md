# Deploy (Railway)

TiltCheck v2 runs as **two Railway services** (web + api) connected to one Supabase project. Use Railway’s GitHub integration — **no SSH deploy keys** unless you add your own VPS.

## Git → Railway (branch sync)

Railway auto-deploys from GitHub branch **`main`** (`jmenichole/tiltcheckmvp`). Pushes to **`master` only** do not trigger deploys.

| Workflow | Command |
|----------|---------|
| **Standard** (recommended) | Work on local `main`, then `git push origin main` |
| **Keep both remotes in sync** | `.\scripts\push-both.ps1` after commit (pushes `main` → `origin/main` + `origin/master`) |
| **One-off sync** | `git push origin main:master` |

First-time local setup:

```powershell
git branch -M main
git push -u origin main
```

`railway redeploy` restarts the last image without rebuilding. After pushing code, wait for GitHub deploy or run `railway up -s tiltcheckmvp` / `railway up -s tiltcheck-api`.

## Services

| Service | Root directory | Build | Start |
|---------|----------------|-------|-------|
| **web** | `apps/web` | From repo root: `pnpm install && pnpm --filter @tiltcheck/web build` | `pnpm --filter @tiltcheck/web start` |
| **api** | `apps/api` | From repo root: `pnpm install && pnpm --filter @tiltcheck/api build` | `node apps/api/dist/index.js` or `pnpm --filter @tiltcheck/api start` |
| **discord** (optional) | `apps/discord` | `pnpm --filter @tiltcheck/discord build` | `node apps/discord/dist/index.js` |

Point each Railway service at the **monorepo root** with the filter commands above, or import [`apps/web/railway.toml`](../../apps/web/railway.toml) / [`apps/api/railway.toml`](../../apps/api/railway.toml) when creating each service.

## Environment matrix

### Web (`apps/web`)

| Variable | Staging example | Production example | Required |
|----------|-----------------|-------------------|----------|
| `NEXT_PUBLIC_WEB_URL` | `https://staging.tiltcheck.me` | `https://tiltcheck.me` | Yes |
| `NEXT_PUBLIC_API_URL` | `https://api-staging.tiltcheck.me` | `https://api.tiltcheck.me` | Yes |
| `NEXT_PUBLIC_SHOW_TOOLS_NAV` | `false` | `false` | No (Phase 4) |
| `NODE_ENV` | `production` | `production` | Yes |

### API (`apps/api`)

| Variable | Staging example | Production example | Required |
|----------|-----------------|-------------------|----------|
| `WEB_URL` | `https://staging.tiltcheck.me` | `https://tiltcheck.me` | Yes (CORS + OAuth handoff) |
| `API_URL` | `https://api-staging.tiltcheck.me` | `https://api.tiltcheck.me` | Yes |
| `PORT` | Railway injects | Railway injects | Auto |
| `SESSION_SECRET` | 32+ char random | 32+ char random | Yes |
| `DISCORD_CLIENT_ID` | Discord app | Same app | Yes (P2+) |
| `DISCORD_CLIENT_SECRET` | Discord app | Same app | Yes (P2+) |
| `DISCORD_REDIRECT_URI_WEB` | `https://api-staging.tiltcheck.me/auth/discord/callback` | `https://api.tiltcheck.me/auth/discord/callback` | Yes (P2+) |
| `SUPABASE_URL` | Staging project | Prod project | Yes (vault + scores) |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging key | Prod key | Yes |

### Extension (Chrome Web Store)

Build locally: `pnpm --filter @tiltcheck/extension build`. Set `EXTENSION_API_URL` at build time to staging or production API. Staging builds may add staging hostnames in `host_permissions`.

### Discord bot (optional)

| Variable | Purpose |
|----------|---------|
| `DISCORD_BOT_TOKEN` | Bot login |
| `TILTCHECK_API_URL` | API base for `/vault status` |
| `TILTCHECK_STATUS_BEARER` | Optional session JWT for a linked user (dev/smoke only) |

## Staging URLs

| Surface | URL |
|---------|-----|
| Marketing / dashboard | `https://staging.tiltcheck.me` |
| API | `https://api-staging.tiltcheck.me` |
| Health | `GET https://api-staging.tiltcheck.me/health` |
| Casino scores | `GET https://api-staging.tiltcheck.me/rgaas/casino-scores` |

Railway default `*.up.railway.app` URLs work before custom DNS — set `WEB_URL` / `NEXT_PUBLIC_*` to match whatever hostname is live.

## Supabase

1. Create staging and production projects (or one staging until cutover).
2. Run SQL in `supabase/migrations/` against each project (Supabase SQL editor or CLI).
3. Seed trust data: `pnpm seed:casino-scores` (alias: `pnpm seed:casinos`; requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`).

## Discord OAuth redirects

Add both callback URLs to the Discord application:

- `https://api-staging.tiltcheck.me/auth/discord/callback`
- `https://api.tiltcheck.me/auth/discord/callback`

Extension login uses the same callback; success posts `discord-auth-success` to the opener window.

## DNS (production cutover — Phase 5)

| Host | Target |
|------|--------|
| `tiltcheck.me` | Railway **web** service |
| `api.tiltcheck.me` | Railway **api** service |
| `dashboard.tiltcheck.me` | 301 → `https://tiltcheck.me/dashboard` (web app redirect) |

Do not cut over marketing DNS until Phase 2 staging gate is green ([phases.md](./phases.md)).

## E2E / smoke tests

```bash
pnpm install
pnpm build
pnpm test:e2e
```

Runs Playwright against `WEB_URL` / `API_URL` (defaults `http://localhost:3000` and `http://localhost:3001`). CI starts API + web before tests. Discord login tests are skipped unless `E2E_DISCORD=1`.

## Extension artifact

```bash
pnpm --filter @tiltcheck/extension build
# Zip apps/extension/dist for Chrome Web Store upload
```
