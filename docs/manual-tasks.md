# TiltCheck v2 — manual task list

Code in this repo is largely ready. These tasks are **your** steps for Supabase, Railway, Discord, DNS, and sign-off. Work top to bottom; do not cut over production DNS until **Phase 2 staging** is checked off.

**Backlog order:** [phases.md](./phases.md) → Single backlog queue

---

## A. Accounts and access

- [x] GitHub: v2 repo pushed and connected to Railway (two services: web + api)
- [x] Supabase: **staging** project live (`tnoyhfbxsykjdbyjwthu`)
- [x] Discord Developer Portal: OAuth app configured
- [x] Railway: web + api services deployed
- [ ] Chrome Web Store: publish extension update (when Phase 2 gate passes)

---

## B. Supabase (staging)

- [x] Migration applied — [`supabase/migrations/20260527000000_initial.sql`](../supabase/migrations/20260527000000_initial.sql)
- [x] `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` on Railway API
- [x] Casino scores seeded — `GET /rgaas/casino-scores` returns `source: supabase` (116 rows)
- [ ] Repeat migration + seed for **production** Supabase before DNS cutover

---

## C. Railway — API (staging)

**URL:** `https://tiltcheck-api-production.up.railway.app`

- [x] Service deployed from [`apps/api/railway.toml`](../apps/api/railway.toml)
- [x] `GET /health` → 200
- [x] `GET /rgaas/casino-scores` → supabase
- [x] `GET /vault` / `POST /vault` → 401 without session (auth gate OK)
- [x] `GET /auth/discord/login` → 302 Discord
- [ ] Confirm env vars current:

  | Variable | Staging value |
  |----------|----------------|
  | `WEB_URL` | `https://tiltcheckmvp-production.up.railway.app` |
  | `API_URL` | `https://tiltcheck-api-production.up.railway.app` |
  | `DISCORD_REDIRECT_URI_WEB` | `https://tiltcheck-api-production.up.railway.app/auth/discord/callback` |

---

## D. Railway — Web (staging)

**URL:** `https://tiltcheckmvp-production.up.railway.app`

- [x] Service deployed from [`apps/web/railway.toml`](../apps/web/railway.toml)
- [x] Discord login → `/dashboard` works (OAuth redirect fix deployed)
- [x] Footer + dashboard UI polish deployed
- [ ] After next deploy: `/touch-grass` loads
- [ ] `NEXT_PUBLIC_API_URL` matches API URL above

---

## E. Discord OAuth

- [x] Redirect added: `https://tiltcheck-api-production.up.railway.app/auth/discord/callback`
- [ ] Add prod redirect before cutover: `https://api.tiltcheck.me/auth/discord/callback`
- [x] Web login tested — lands on `/dashboard`

### Extension OAuth — do NOT use `localhost:3001` unless API is running locally

| URL | When to use |
|-----|-------------|
| `https://tiltcheck-api-production.up.railway.app/auth/discord/login?source=ext` | **Default** — staging extension build |
| `http://localhost:3001/auth/discord/login?source=ext` | Only if you started local API: `cd apps/api && node …` or `pnpm --filter @tiltcheck/api dev` |

**"Site can't be reached" on localhost:3001** = API not running on your machine. Use the staging URL above, or start the API locally first.

---

## F. DNS — staging (optional)

- [ ] `staging.tiltcheck.me` → Railway web
- [ ] `api-staging.tiltcheck.me` → Railway api
- [ ] Update `WEB_URL` / `API_URL` / `NEXT_PUBLIC_*` after DNS

---

## G. Phase 1 smoke (staging)

- [x] Home CTAs → `/extension` and `/casinos`
- [x] Casino directory + slug pages
- [x] Legal: `/privacy`, `/terms`, `/legal`
- [x] Tools not in primary nav
- [ ] Extension page links to **legacy** Chrome Web Store listing (until v2 CWS update)

---

## H. Phase 2 — extension staging build

**Design spec:** [2026-06-07-phase-2-protected-session-design.md](./superpowers/specs/2026-06-07-phase-2-protected-session-design.md)

### Build (PowerShell)

```powershell
$env:EXTENSION_API_URL = "https://tiltcheck-api-production.up.railway.app"
$env:EXTENSION_WEB_URL = "https://tiltcheckmvp-production.up.railway.app"
cd apps/extension
node build.js
```

Use `node build.js` if `pnpm build` hits `EPERM` on `~\node_modules\bufferutil`.

### Checklist

- [ ] Load unpacked `apps/extension/dist` in Chrome
- [ ] Extension OAuth: use **staging API URL** (not localhost unless API running locally)
- [ ] Sidebar → Connect Discord → `tc_session_token` set, `tc_demo: false`
- [ ] Dashboard → Vault tab → save session cap → **refresh** → rule persists
- [ ] Extension storage: `tc_vault_rules` includes enabled `session_cap`

---

## I. Phase 2 — enforcement gate (blocks prod DNS)

- [ ] Test casino tab + extension active
- [ ] Rapid-click until **critical** tilt
- [ ] Touch Grass overlay (teal hero, undismissable timer)
- [ ] Betting UI blocked until timer ends
- [ ] Service worker: `[TiltCheck] Enforcement fired`
- [ ] Optional: visit `/touch-grass` after lockout — page loads
- [ ] `pnpm test:e2e` green

Definition: [cutover-checklist.md](./cutover-checklist.md)

---

## J. Phase 2 fast-follow quick wins (in repo / deploying)

- [ ] `/touch-grass` page live on staging
- [ ] `GET /rgaas/casino-lookup?q=stake` returns casino object
- [ ] Rebuild + reload extension after API deploy

---

## K. Production Railway + Supabase

- [ ] Clone staging env → production Railway services
- [ ] Production Supabase: migration + seed
- [ ] Production Discord redirect on `api.tiltcheck.me`
- [ ] Re-run Phase 1 + Phase 2 smoke on prod hostnames

---

## L. Production DNS cutover (only after H + I green)

- [ ] `tiltcheck.me` → Railway web
- [ ] `api.tiltcheck.me` → Railway api
- [ ] `dashboard.tiltcheck.me` → 301 `/dashboard`
- [ ] Chrome Web Store: `EXTENSION_API_URL=https://api.tiltcheck.me`
- [ ] Smoke: login → vault → one enforcement

---

## M. v1 parallel ops

- [ ] Crawler on v1: `CRAWLER_API_URL=https://api.tiltcheck.me`
- [ ] v2 `/bonuses` uses `BONUSES_UPSTREAM_URL` until v2 ingest
- [ ] Archive `tiltcheck-monorepo` after cutover stable

Details: [v1-ops.md](./v1-ops.md).

---

## N. Post-cutover (Phase 3+)

See [phases.md](./phases.md) backlog items 6–17: Analytics, Buddies, Bonuses tab, `/stake`/`/nuts`, domain-verifier, scan-scams, license-check, stats KPI, CollectClock, breathalyzer API, newsletter, microgrant.

---

## Quick reference

| What | Where |
|------|--------|
| Backlog queue | [phases.md](./phases.md) |
| Phase 2 spec | [superpowers/specs/2026-06-07-phase-2-protected-session-design.md](./superpowers/specs/2026-06-07-phase-2-protected-session-design.md) |
| Deploy env matrix | [deploy.md](./deploy.md) |
| Enforcement definition | [cutover-checklist.md](./cutover-checklist.md) |

### Staging URLs

| Service | URL |
|---------|-----|
| API | `https://tiltcheck-api-production.up.railway.app` |
| Web | `https://tiltcheckmvp-production.up.railway.app` |
| Ext OAuth (staging) | `https://tiltcheck-api-production.up.railway.app/auth/discord/login?source=ext` |
