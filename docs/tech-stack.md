# Tech stack (locked)

TiltCheck v2 is a slim pnpm + Turbo monorepo. This document is the canonical stack reference for deploy, onboarding, and cutover.

| Layer | Choice | Notes |
|-------|--------|--------|
| **Monorepo** | pnpm workspaces + Turbo | Root `pnpm build` builds all packages/apps |
| **Web** | Next.js 16 (App Router) | `apps/web` — marketing, auth handoff, dashboard |
| **API** | Hono on Node | `apps/api` — Discord OAuth, sessions, vault, trust, tool stubs |
| **Database** | Supabase Postgres + `@supabase/supabase-js` | Service role in API only; migrations in `supabase/migrations` |
| **Auth** | Discord OAuth (API) | `web_` / `ext_` OAuth state; session JWT cookie — **not** Supabase Auth |
| **Trust data** | `packages/trust` + `casino_scores` table | Static `casinos.json` fallback when DB empty |
| **Extension** | Chrome MV3, esbuild | `apps/extension` — tilt detect + enforcement overlay |
| **Discord** | discord.js (minimal) | `apps/discord` — `/vault status` scaffold |
| **Hosting** | **Railway** | Separate services: **web** + **api** (+ discord later) |
| **CI** | GitHub Actions | `pnpm lint` + `pnpm build` + Playwright smoke |
| **E2E** | Playwright | Smoke tests against local or staging URLs (no secrets required) |
| **Deploy keys** | **None** | Railway GitHub integration; no SSH deploy key unless you add a VPS |

## Packages

- `@tiltcheck/shared` — types, env helpers
- `@tiltcheck/trust` — casino catalog + score helpers
- `@tiltcheck/db` — Supabase admin client + queries
- `@tiltcheck/web`, `@tiltcheck/api`, `@tiltcheck/extension`, `@tiltcheck/discord`

## Out of scope (v2 greenfield)

Operators/RGaaS portal, trust-rollup microservice, wallet/SOL lockvault, 40+ v1 packages, Vercel-first deploy, SSH deploy keys for Railway.

## Related

- [phases.md](./phases.md) — ship order and cutover gate
- [deploy.md](./deploy.md) — Railway env matrix and URLs
- [migration-from-v1.md](./migration-from-v1.md) — trust-only data migration
