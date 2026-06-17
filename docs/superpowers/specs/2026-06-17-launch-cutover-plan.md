# Launch & Cutover Plan — B+D Strategy (v1 freeze + MVP forward build)

**Date:** 2026-06-17  
**Status:** Approved  
**Strategy:** **B** (staging gate before DNS) + **D** (solo bandwidth — v1 ops-only, MVP owns product)  
**Related:** [LAUNCH-CHECKLIST.md](../LAUNCH-CHECKLIST.md), [phases.md](../phases.md), [manual-tasks.md](../manual-tasks.md)

> Canonical copy with v1 cross-links: `TiltCheck-ME/tiltcheck-monorepo` → `docs/superpowers/specs/2026-06-17-launch-cutover-plan.md`

---

## 1. Decision summary

| Choice | What it means |
|--------|----------------|
| **Two repos until M3** | v1 monorepo stays live for crawler, legacy bots, and prod API until cutover. This MVP repo is the forward build. |
| **v1 freeze (M0)** | No new product features on v1. Only P0 ops: secrets, ingest auth, crawler runs, hotfixes. |
| **MVP owns product** | Bonuses feed, sitemap/SEO, Degen Copilot, dashboard depth — all land here post-M2 unless explicitly bridged on v1. |
| **Staging gate (M1)** | Production DNS does **not** move until Phase 2 protected-session loop passes on staging. |
| **Archive v1 (M3)** | After DNS stable + email-ingest on MVP, mark v1 monorepo read-only. |

---

## 2. North-star KPI

**Protected sessions per week** — authed user, enabled `session_cap`, enforcement fired ≥1× in 7d.

Track in [metrics-weekly.md](../metrics-weekly.md).

---

## 3. Milestones M0–M5

| ID | Name | Key exit |
|----|------|----------|
| M0 | Freeze policy | v1 = ops; MVP = product; push pending branches |
| M1 | Staging P2 gate | Extension → login → vault → Touch Grass enforcement |
| M2 | DNS cutover | `tiltcheck.me` + `api.tiltcheck.me` → MVP Railway |
| M3 | Decommission v1 | v2 email ingest; archive monorepo |
| M4 | Phase 3 | Analytics, bonuses tab, buddies, Degen Copilot |
| M5 | Phase 4–5 | Tools depth, Discord bot, operators |

**Operator checklist:** [LAUNCH-CHECKLIST.md](../LAUNCH-CHECKLIST.md)  
**Engineering tasks:** [2026-06-17-launch-cutover-execution.md](../plans/2026-06-17-launch-cutover-execution.md)

---

## 4. MVP branches awaiting owner push

`cursor[bot]` gets **403** on this repo. Push from an account with write access:

| Branch | Contents |
|--------|----------|
| `cursor/daily-bonus-feed-port-ec58` | Daily bonus feed + `/bonuses` |
| `cursor/web-sitemap-ec58` | sitemap, robots, `/site-map`, 404 |

---

**Next step:** [LAUNCH-CHECKLIST.md § M0](../LAUNCH-CHECKLIST.md)
