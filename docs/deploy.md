# Deploy (Railway)

TiltCheck v2 runs as **two Railway services** (web + api) connected to one Supabase project. Use Railway’s GitHub integration — **no SSH deploy keys** unless you add your own VPS.

## Git → Railway (branch sync)

Railway auto-deploys from GitHub branch **`main`** (`jmenichole/tiltcheckmvp`) when the GitHub integration is active and billing is current. Pushes to **`master` only** do not trigger deploys.

**If pushes to `main` stop deploying** (last deploy stuck on an old commit):

1. **Railway billing** — expired trials block new deploys. In [Railway](https://railway.com) → workspace → **Upgrade** or attach a plan.
2. **Reconnect GitHub** — Project → **Settings** → **GitHub** → confirm repo `jmenichole/tiltcheckmvp`, branch `main`, auto-deploy on.
3. **GitHub Actions fallback** — [`.github/workflows/deploy-railway.yml`](../.github/workflows/deploy-railway.yml) deploys after CI passes on `main`:
   - Railway → project **endearing-upliftment** → **Settings** → **Tokens** → create a **Project Token** (production).
   - GitHub → repo **Settings** → **Secrets and variables** → **Actions** → add secret `RAILWAY_TOKEN`.
   - Push to `main`; **Deploy Railway** runs after **CI** succeeds.

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

`railway redeploy` restarts the last image without rebuilding. CLI deploy: `railway up -s web` / `railway up -s tiltcheck-api` (requires active Railway plan).

### Production service IDs (GitHub Actions)

| Service | Railway name | Service ID | URL |
|---------|--------------|------------|-----|
| Web | `web` | `aab55075-8fbb-4e0d-be80-81a88c7a5e3d` | `https://tiltcheckmvp-production.up.railway.app` |
| API | `tiltcheck-api` | `db1349cb-1b0e-45f2-9e48-767b9452730b` | `https://tiltcheck-api-production.up.railway.app` |

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
| `NEXT_PUBLIC_CHROME_WEB_STORE_URL` | *(empty until listed)* | `https://chromewebstore.google.com/detail/tiltcheck/EXTENSION_ID` | No |
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

Install URL env (web + extension build):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CHROME_WEB_STORE_URL` | Web CTAs — empty until listed; then full CWS detail URL |
| `EXTENSION_CWS_URL` | Optional override for extension popup link (defaults to `NEXT_PUBLIC_CHROME_WEB_STORE_URL` at build) |

When unset, all install CTAs route to `/extension`. See [extension-publish.md](./extension-publish.md).

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
