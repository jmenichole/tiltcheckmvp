# TiltCheck v2 — Session knowledge capture

**Captured:** 2026-05-27  
**Type:** Decision + How-To + FAQ  
**Project:** TiltCheck MVP (greenfield)  
**Repo:** https://github.com/jmenichole/tiltcheckmvp  
**Local path:** `C:\Users\jmeni\Projects\tiltcheck`  
**Legacy prod:** `C:\Users\jmeni\tiltcheck-monorepo` (until DNS cutover)

> Paste this page into Notion under TiltCheck / Engineering wiki when Notion MCP is connected.

---

## Executive summary

TiltCheck moved from an overloaded v1 monorepo to a **lean v2 repo** focused on the north-star loop: web trust funnel → extension protection → dashboard vault rules → API enforcement. Production stays on v1 until **Phase 2 staging** passes (login → vault → Touch Grass enforcement). Marketing can ship earlier; **DNS cutover requires Phase 1 + Phase 2 green**.

---

## Key decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rewrite strategy | Greenfield repo, not refactor v1 | v1 had 45+ web routes, 18 apps, 40+ packages |
| v2 repo | `jmenichole/tiltcheckmvp` on GitHub | Clean history; Railway connects here |
| Hosting | Railway for **web + api** (two services) | User choice; no SSH deploy keys needed |
| Stack | pnpm + Turbo, Next 16, Hono, Supabase JS, esbuild MV3 | Matches team familiarity; minimal layers |
| Auth | Discord OAuth in API (`web_` / `ext_` state) | Not Supabase Auth |
| Data migration | **Trust-only**; users re-login at cutover | Simpler cutover |
| North-star metric | **Protected sessions** (tilt → enforcement) | Not traffic or casino lookups alone |
| ICP | Solo degen | Extension + vault over Discord/buddies at cutover |
| Dashboard at cutover | **Profile + Vault only** | Buddies/analytics/bonuses → Phase 3 |
| Phase model | Combined phases in `docs/phases.md` | P1 prod OK alone; P1+P2 required before DNS |
| Bonuses UX | Crawler → v1 API ingest → v2 `/bonuses` proxy | Public picks now; full dashboard tab Phase 3 |
| v1 email crawler | Stays on v1; `CRAWLER_API_URL=https://api.tiltcheck.me` | v2 ingest not shipped yet |
| Agent constraints | README CRITICAL AGENT RULE + `docs/phases.md` scope | Lean MVP, brand voice, non-custodial |

---

## Architecture (v2)

```
apps/web       → Marketing, /casinos, /bonuses, /login, /dashboard
apps/api       → Hono: auth, vault, casino-scores, bonuses proxy
apps/extension → MV3: tilt detect, vault sync, Touch Grass enforcement
apps/discord   → Scaffold (Phase 5)
packages/trust → Static catalog + score merge
packages/db    → Supabase admin client
```

**Cutover rule:** Do not point `tiltcheck.me` at v2 until staging proves install → login → vault → enforcement.

---

## Phase status (code vs manual)

| Phase | Code | Manual / you |
|-------|------|----------------|
| **1** Trust + funnel | Done (routes, static+API scores, seed script) | Supabase migrate + seed; Railway staging |
| **2** Protected session | Done (vault CRUD, ext enforcement, Playwright CI) | Discord redirects; staging E2E sign-off |
| **3** Dashboard depth | Partial (`/bonuses` picks only) | Analytics, buddies, full bonus inbox |
| **4** Tools | Stubs, hidden from nav | session-stats → verify → house-edge |
| **5** Cutover | Docs + discord partial | DNS, CWS extension API URL, archive v1 |

---

## How-To: Supabase casino scores seed

**Requires only:**

- `SUPABASE_URL` — Project Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service_role key (never in browser)

**Steps:**

1. Run `supabase/migrations/20260527000000_initial.sql` in Supabase SQL editor
2. Copy `.env.example` → `.env` and fill the two vars above
3. Load env in shell (seed does not auto-load `.env`)
4. `pnpm seed:casino-scores`
5. Verify: `GET http://localhost:3001/rgaas/casino-scores`

API process needs the same two vars for live feed (not just seed).

---

## How-To: First weekend path (minimal order)

1. **Saturday local:** Supabase → seed → API + web dev → Discord login → vault → extension unpacked → enforcement test
2. **Sunday Railway:** Deploy api + web to `*.up.railway.app` → repeat login/vault/enforcement
3. **Skip until Phase 2 green:** Production DNS, Chrome Web Store publish, v1 archive

**Do not block Phase 2 on live bonuses or casino live feed** — STATIC fallback is OK.

---

## How-To: Email crawler (v1)

**Problem fixed:** Every ingest failed with `fetch failed` because `CRAWLER_API_URL` pointed at `localhost:3000/api` during scheduled runs.

**Fix:** `CRAWLER_API_URL=https://api.tiltcheck.me` (no `/api` prefix)

**Bonus digest:** `pnpm crawl:emails:digest` or `--digest` — daily/time-sensitive summary in logs + JSON under `scripts/logs/`

---

## Bonuses product flow

| Layer | Responsibility |
|-------|----------------|
| Email crawler (v1) | Ingest + optional digest |
| v1 API | `GET /bonuses?source=inbox&sort=urgency` |
| v2 web | `/bonuses` — proxies via `BONUSES_UPSTREAM_URL` |
| Phase 3 | Dashboard bonuses tab + full list |

Empty `/bonuses` = upstream inbox empty or crawler not run — not a Phase 2 blocker.

---

## FAQ

**Is v2 a new repo?**  
Yes. `tiltcheckmvp` on GitHub. v1 stays production until cutover.

**SSH deploy key for GitHub?**  
No for Railway GitHub integration. Only if you add a VPS that git-pulls.

**Why "Live feed: unavailable" on /casinos?**  
API down, wrong `NEXT_PUBLIC_API_URL`, or Supabase not seeded. STATIC grades still work.

**Why empty /bonuses?**  
Inbox feed empty; set `BONUSES_UPSTREAM_URL` and run v1 crawler.

**What blocks production DNS?**  
Phase 2 staging gate: Touch Grass on critical tilt after vault set. See `docs/cutover-checklist.md`.

---

## Brand / agent rules (from README)

- Lean MVP — no scope creep outside `docs/phases.md` Phase 1/2
- Voice: sharp friend, dry wit, millennial slang natural (no cap, touch grass, etc.)
- No emojis in code/UI/commits
- Copyright header on new source files
- Non-custodial always

---

## Related docs (repo)

| Doc | Path |
|-----|------|
| Ship gates | `docs/phases.md` |
| Manual checklist | `docs/manual-tasks.md` |
| Deploy | `docs/deploy.md` |
| Stack | `docs/tech-stack.md` |
| Cutover | `docs/cutover-checklist.md` |
| v1 ops | `docs/v1-ops.md` |
| Bonuses | `docs/bonuses.md` |

---

## Action items (open)

- [ ] Supabase staging: migrate + seed
- [ ] Railway: web + api services from `main`
- [ ] Discord OAuth redirect URIs (staging + prod API hosts)
- [ ] Phase 2 manual gate on staging
- [ ] Production DNS cutover (after gate)
- [ ] Connect Notion MCP and link this page from TiltCheck wiki hub
- [ ] Review Dependabot alert on GitHub repo (1 moderate)

---

## Notion placement (when MCP works)

**Suggested location:** TiltCheck → Engineering wiki → **TiltCheck MVP v2**

**Properties (if using Documentation database):**

| Property | Value |
|----------|-------|
| Title | TiltCheck v2 — decisions & runbook (2026-05-27) |
| Type | Decision + How-To |
| Category | Engineering |
| Tags | tiltcheck, mvp, greenfield, railway, supabase |
| Status | Published |

**Link from:** TiltCheck project overview, Deployment runbook index, Product phases page.
