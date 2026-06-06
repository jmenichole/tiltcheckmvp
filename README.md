# TiltCheck MVP

A slimmed-down, hyper-focused monorepo for the core TiltCheck loop: prove casino trust, protect live sessions, and enforce durable bankroll rules.

> **CRITICAL AGENT RULE:** We are strictly building a lean MVP.
> - Never add extra dependencies, unused files, or future-proofed boilerplate.
> - Always suggest the absolute simplest, most direct code solutions.
> - If a feature is not in **Phase 1 or Phase 2** of [docs/phases.md](./docs/phases.md), do not write code for it.
> - Never use emojis in source code, comments, commit messages, or UI text (markdown docs only).
> - **TONE:** Copy, comments, error messages, and UI text must be direct and sharp. No fluff, no apologies. Humor, dry wit, sarcasm, and millennial slang are part of the brand — a sharp friend who gives a damn: honest about bad decisions, funny about it, never cruel, always in your corner.
> - **Voice pillars:**
>   - Humor and wit — dry, deadpan, never try-hard. Funny because it's true.
>   - Sarcasm — pointed but not mean. ("Oh cool, another loss. Very normal behavior.")
>   - Millennial slang — natural, not forced: no cap, lowkey, big yikes, it's giving, we see you, cooked, locked in, the math is mathing, touch grass.
> - **COPYRIGHT:** Every new or modified source file must include: `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: [YYYY-MM-DD]`.
> - **NON-CUSTODIAL:** Never store private keys, seeds, or hold user funds. Pass-through or client-side signing only.

**North-star metric:** protected sessions (tilt detected → enforcement fires), not traffic alone.

**Ship order and cutover gates:** [docs/phases.md](./docs/phases.md) is the source of truth — not duplicate checklists in this file.

---

## Core architecture

Limited to these surfaces (no new apps without updating phases.md):

| Surface | Role |
|---------|------|
| `apps/web` | Next.js — marketing, Discord auth, unified dashboard (`/dashboard`) |
| `apps/api` | Hono — OAuth, trust scores, vault CRUD, bonuses proxy |
| `apps/extension` | Chrome MV3 — tilt detection, vault sync, Touch Grass enforcement |
| `apps/discord` | Scaffold — alerts and `/vault status` (Phase 5) |
| `packages/trust` | Casino catalog + score merge helpers |
| `packages/db` | Supabase client + vault/user/score access |
| `packages/shared` | Shared types and env helpers |

---

## Quick start

```bash
pnpm install
pnpm build
pnpm --filter @tiltcheck/api dev   # :3001
pnpm --filter @tiltcheck/web dev   # :3000
```

Copy `.env.example` to `.env`. Minimum for casino scores seed: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Phase 2 also needs Discord OAuth vars — see [deploy.md](./docs/deploy.md).

Other commands:

```bash
pnpm seed:casino-scores   # after Supabase migration
pnpm test:e2e             # Playwright smoke (web)
```

---

## Docs

| Doc | Purpose |
|-----|---------|
| [phases.md](./docs/phases.md) | Phase plan, ship gates, current status |
| [manual-tasks.md](./docs/manual-tasks.md) | Your checklist: Supabase, Railway, Discord, DNS |
| [tech-stack.md](./docs/tech-stack.md) | Locked stack (pnpm, Next 16, Hono, Supabase, Railway) |
| [deploy.md](./docs/deploy.md) | Railway web + API, env matrix, E2E |
| [cutover-checklist.md](./docs/cutover-checklist.md) | Staging gate + DNS cutover |
| [v1-ops.md](./docs/v1-ops.md) | Email crawler + legacy monorepo until cutover |
| [bonuses.md](./docs/bonuses.md) | Inbox bonuses: crawler → API → `/bonuses` |
| [migration-from-v1.md](./docs/migration-from-v1.md) | v1 → v2 path mapping |

Repo: https://github.com/jmenichole/tiltcheckmvp
