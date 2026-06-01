# TiltCheck v2 — manual task list

Code in this repo is largely ready. These tasks are **your** steps for Supabase, Railway, Discord, DNS, and sign-off. Work top to bottom; do not cut over production DNS until **Phase 2 staging** is checked off.

---

## A. Accounts and access

- [ ] GitHub: v2 repo pushed and connected to Railway (two services: web + api)
- [ ] Supabase: create **staging** project (and **production** when ready)
- [ ] Discord Developer Portal: app for OAuth (`DISCORD_CLIENT_ID` / `SECRET`)
- [ ] Railway: billing OK; custom domains available for staging/prod
- [ ] Chrome Web Store: access to publish extension update (when Phase 2 is ready)

---

## B. Supabase (staging first)

- [ ] Open SQL editor (or Supabase CLI) for staging project
- [ ] Run migration: [`supabase/migrations/20260527000000_initial.sql`](../supabase/migrations/20260527000000_initial.sql)
- [ ] Copy **Project URL** → `SUPABASE_URL`
- [ ] Copy **service role** key → `SUPABASE_SERVICE_ROLE_KEY` (API only; never in web or git)
- [ ] From repo root with `.env` filled:
  ```bash
  pnpm seed:casino-scores
  ```
- [ ] Confirm rows in `casino_scores` (or verify API returns `source` other than static-only)
- [ ] Repeat migration + seed for **production** Supabase when you are ready for prod (can wait until after staging sign-off)

---

## C. Railway — API service (staging)

- [ ] New service from GitHub repo; use [`apps/api/railway.toml`](../apps/api/railway.toml) or commands in [deploy.md](./deploy.md)
- [ ] Set environment variables:

  | Variable | Example (staging) |
  |----------|-------------------|
  | `WEB_URL` | `https://staging.tiltcheck.me` (or `*.up.railway.app` until DNS) |
  | `API_URL` | `https://api-staging.tiltcheck.me` |
  | `SESSION_SECRET` | 32+ random characters |
  | `DISCORD_CLIENT_ID` | From Discord app |
  | `DISCORD_CLIENT_SECRET` | From Discord app |
  | `DISCORD_REDIRECT_URI_WEB` | `https://api-staging.tiltcheck.me/auth/discord/callback` |
  | `SUPABASE_URL` | Staging project |
  | `SUPABASE_SERVICE_ROLE_KEY` | Staging service role |

- [ ] Deploy; confirm `GET https://<api-host>/health` returns OK
- [ ] Confirm `GET https://<api-host>/rgaas/casino-scores` returns casinos

---

## D. Railway — Web service (staging)

- [ ] Second service from same repo; use [`apps/web/railway.toml`](../apps/web/railway.toml)
- [ ] Set environment variables:

  | Variable | Example (staging) |
  |----------|-------------------|
  | `NEXT_PUBLIC_WEB_URL` | Same as `WEB_URL` above |
  | `NEXT_PUBLIC_API_URL` | Same as `API_URL` above |
  | `NEXT_PUBLIC_SHOW_TOOLS_NAV` | `false` |
  | `BONUSES_UPSTREAM_URL` | `https://api.tiltcheck.me/bonuses` (optional; v1 inbox feed) |

- [ ] Deploy; open staging URL — home, `/casinos`, `/extension` load
- [ ] Optional: `https://<web-host>/bonuses` shows picks (upstream or static fallback)

---

## E. Discord OAuth

- [ ] Discord app → OAuth2 → Redirects — add:
  - `https://api-staging.tiltcheck.me/auth/discord/callback`
  - `https://api.tiltcheck.me/auth/discord/callback` (for prod later)
- [ ] Scopes: `identify` (and any others your v1 app used)
- [ ] After deploy, test: `https://<web-host>/login` → Discord → lands on `/dashboard` with session cookie

---

## F. DNS — staging (optional but recommended)

- [ ] `staging.tiltcheck.me` → Railway **web** service
- [ ] `api-staging.tiltcheck.me` → Railway **api** service
- [ ] Update Railway env `WEB_URL`, `API_URL`, `NEXT_PUBLIC_*` to match custom hostnames
- [ ] Redeploy both services after URL changes

---

## G. Phase 1 smoke (staging)

- [ ] Home CTAs → `/extension` and `/casinos`
- [ ] Casino directory + at least one `/casinos/[slug]` page
- [ ] Extension page links to **existing** Chrome Web Store listing (legacy extension OK for Phase 1)
- [ ] Legal pages: `/privacy`, `/terms`, `/legal`
- [ ] Tools not in primary nav

---

## H. Phase 2 — extension staging build

- [ ] Build extension pointing at staging API:
  ```bash
  cd apps/extension
  EXTENSION_API_URL=https://api-staging.tiltcheck.me pnpm build
  ```
- [ ] Load unpacked `apps/extension/dist` in Chrome (Developer mode)
- [ ] Log in via extension Discord flow; confirm token in storage (`tc_demo: false`)
- [ ] On web dashboard: set **session cap** (Vault tab) — confirm `POST /vault` persists (refresh page, rule still there)

---

## I. Phase 2 — enforcement gate (required before prod DNS)

- [ ] Open a test casino site in Chrome with extension enabled
- [ ] Trigger **critical** tilt (fast-click pattern per extension logic)
- [ ] Confirm **Touch Grass** fullscreen overlay appears
- [ ] Confirm betting UI blocked until timer ends
- [ ] Service worker console: `[TiltCheck] Enforcement fired`
- [ ] Run local or CI: `pnpm test:e2e` (green on `main`)

Full definition: [cutover-checklist.md](./cutover-checklist.md) → “Definition: enforcement fires”.

---

## J. Production Railway + Supabase

- [ ] Duplicate Railway services or promote staging → **production** env vars
- [ ] Production Supabase: run migration + `pnpm seed:casino-scores`
- [ ] Production Discord redirect: `https://api.tiltcheck.me/auth/discord/callback`
- [ ] Re-run Phase 1 + Phase 2 smoke on production hostnames (or accept staging sign-off if prod is clone)

---

## K. Production DNS cutover (only after H + I are green)

- [ ] `tiltcheck.me` → Railway **web**
- [ ] `api.tiltcheck.me` → Railway **api**
- [ ] `dashboard.tiltcheck.me` → **301** to `https://tiltcheck.me/dashboard`
- [ ] Publish Chrome Web Store update with `EXTENSION_API_URL=https://api.tiltcheck.me`
- [ ] Smoke prod: login, vault, one enforcement test on a throwaway session

---

## L. v1 parallel ops (do not forget)

- [ ] Email crawler on v1 monorepo: `CRAWLER_API_URL=https://api.tiltcheck.me` in `.env`
- [ ] Run crawler with limit if backlog: `pnpm crawl:emails -- --limit 100` (optional `--digest`)
- [ ] v2 `/bonuses` uses `BONUSES_UPSTREAM_URL` until v2 ingest exists
- [ ] After cutover stable: archive `tiltcheck-monorepo` on GitHub (read-only)
- [ ] Plan v2 `POST /rgaas/email-ingest` before moving crawler off v1

Details: [v1-ops.md](./v1-ops.md).

---

## M. Post-cutover (Phase 3+)

- [ ] Analytics tab + API
- [ ] Buddies (simplified)
- [ ] Dashboard bonuses tab (full list; public `/bonuses` already partial)
- [ ] Tools: session-stats → verify → house-edge
- [ ] Discord bot on Railway (`DISCORD_BOT_TOKEN`, `TILTCHECK_API_URL`)

Order: [phases.md](./phases.md).

---

## Quick reference

| What | Where |
|------|--------|
| Deploy env matrix | [deploy.md](./deploy.md) |
| Ship gates | [phases.md](./phases.md) |
| Enforcement definition | [cutover-checklist.md](./cutover-checklist.md) |
| Stack choices | [tech-stack.md](./tech-stack.md) |
