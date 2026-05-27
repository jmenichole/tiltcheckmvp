# TiltCheck (greenfield)

Slim monorepo for the north-star loop: web funnel, API, extension, unified dashboard.

**Priorities and ship order:** [docs/phases.md](./docs/phases.md) is the source of truth for what ships in each phase and what blocks production cutover.

## Structure

- `apps/web` — Next.js marketing + auth + dashboard
- `apps/api` — Hono API (auth, trust scores, vault, tools)
- `apps/extension` — Chrome MV3
- `apps/discord` — minimal Discord bot scaffold
- `packages/trust` — casino catalog + score helpers
- `packages/db` — Supabase helpers
- `packages/shared` — shared types and env helpers

## Develop

```bash
pnpm install
pnpm build
pnpm --filter @tiltcheck/api dev
pnpm --filter @tiltcheck/web dev
```

Copy `.env.example` to `.env` and fill Discord/Supabase when ready.

## Priorities

Roadmap and ship gates: **[docs/phases.md](./docs/phases.md)** (source of truth).

## Docs

- [phases.md](./docs/phases.md) — combined phase plan (acquisition + session loop + cutover)
- [migration-from-v1.md](./docs/migration-from-v1.md)
- [deploy.md](./docs/deploy.md)
- [cutover-checklist.md](./docs/cutover-checklist.md)
