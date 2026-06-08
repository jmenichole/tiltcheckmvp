# Staging sign-off — feat/protection-and-ia

**Date:** 2026-06-08  
**Branch:** `feat/protection-and-ia`  
**Scope:** Track 1 (game exclusion, tilt profiles, onboarding, extension panel) + Phase 2 gate prep

---

## Automated results (agent-run)

| Check | Result | Notes |
|-------|--------|-------|
| `@tiltcheck/shared` unit tests (8) | **PASS** | `matchGameExclusion`, URL patterns, validation |
| Extension `node build.js` | **PASS** | Bundles; no user-facing "Vault" button |
| Production `GET /health` (G1) | **PASS** | `ok: true` |
| Production `GET /rgaas/casino-scores` (G1) | **PASS** | `source: supabase`, 116 casinos |
| Local `GET /health` | **PASS** | `:3001` |
| Playwright e2e (12 tests) | **PASS** | System Chrome channel; 11 run + 1 skipped (Discord live) |
| Production web `/`, `/casinos`, `/extension` | **PASS** | HTTP 200 |
| Production `/dashboard` unauthed | **PASS** | 307 → login (expected) |

**Playwright fix:** local runs use `channel: 'chrome'` when not CI (bundled Chromium install fails on this machine).

---

## Phase 1 — marketing (cutover-checklist)

| Item | Auto | Manual |
|------|------|--------|
| Home CTAs → `/extension`, `/casinos` | Partial (e2e: extension CTA on `/`) | Confirm hamburger Casino Trust link on prod |
| Casino directory + fallback | **PASS** (e2e + API) | Spot-check one slug detail |
| `GET /health` + casino-scores | **PASS** on prod API | — |
| Tools not in primary nav | — | **YOU:** confirm `NEXT_PUBLIC_SHOW_TOOLS_NAV` on Railway web |

---

## Phase 2 — protected session (G1–G7)

| # | Criterion | Status | How verified |
|---|-----------|--------|------------|
| G1 | API + Supabase | **PASS** | Prod health + casino-scores `source: supabase` |
| G2 | Discord OAuth configured | **NOT RUN** | Needs live OAuth click on staging/prod |
| G3 | Login → dashboard + cookie | **NOT RUN** | You confirmed extension Discord login works |
| G4 | Vault / lockout persists | **NOT RUN** | Dashboard → Save session cap → refresh |
| G5 | Extension auth + sync | **PARTIAL** | Code review; you confirmed login; hit **Refresh rules** |
| G6 | **Enforcement fires** | **NOT RUN** | Critical tilt OR game block → Touch Grass overlay |
| G7 | CI / e2e green | **PASS** locally | Re-run on CI after merge |

### Enforcement definition (must all pass on staging)

1. [ ] `tc_session_token` + `tc_demo: false` in extension storage  
2. [ ] Enabled `session_cap` from dashboard (**Lockout time** in panel)  
3. [ ] Critical tilt (conservative: ~10 fast clicks in 5s) **OR** blocked game URL  
4. [ ] `#tiltcheck-lockdown-root` fullscreen overlay  
5. [ ] Bet/spin controls disabled until timer ends  
6. [ ] No early dismiss; SW log `[TiltCheck] Enforcement fired`

---

## Game exclusion gate (spec §5.2 — extends Phase 2)

**Prerequisite:** Apply migration on Supabase before settings sync works in prod:

```sql
-- supabase/migrations/20260528120000_game_exclusions.sql
```

| Step | Status |
|------|--------|
| 1. Login → onboarding wizard → Blackjack block | **NOT RUN** |
| 2. Save settings → extension **Refresh rules** | **NOT RUN** |
| 3. URL with `blackjack` → immediate block | **NOT RUN** |
| 4. Blackjack → warn → 10s → block | **NOT RUN** |
| 5. Conservative sensitivity → earlier tilt | **NOT RUN** |
| 6. Demo mode → banner only, no Touch Grass | **NOT RUN** |
| 7. Settings persist after logout/login | **NOT RUN** |

---

## Logged-in IA (spec §8)

| # | Item | Status |
|---|------|--------|
| 1 | Logged-out `/` marketing hero | **PASS** (e2e) |
| 2 | Login → dashboard | **NOT RUN** |
| 3 | Authed `/` command center | **NOT RUN** |
| 4–5 | Cap CTA / armed copy | **NOT RUN** |
| 6–7 | Authed `/login` redirects | **PASS** (e2e cookie stub) |
| 8 | Logout → marketing | **NOT RUN** |
| 9–10 | Nav labels + `/casinos` reachable | **NOT RUN** |

---

## Extension UX (your feedback)

| Item | Status |
|------|--------|
| Draggable TC chip (not blocking UI) | **YOU** reload `apps/extension/dist` |
| No confusing "Vault" button | **PASS** in build → Game blocks / Lockout time / Refresh rules |
| Touch Grass vs balance vault clarified | **PASS** in panel copy |

---

## Recommended 15-min manual pass (before merge/deploy)

1. **Supabase:** run `20260528120000_game_exclusions.sql` on staging (and prod when ready).  
2. **Extension:** load unpacked from `apps/extension/dist` (prod API URLs in build).  
3. **Discord login** → panel shows username, **Touch Grass lockout armed** after dashboard save.  
4. **Settings:** toggle Blackjack block → Save → **Refresh rules** in panel.  
5. Open `https://stake.us/casino/games/blackjack` (or any URL with `blackjack`) → block overlay.  
6. **Tilt test:** conservative profile, spam-click → Touch Grass within ~10 clicks.  
7. Service worker console → `[TiltCheck] Enforcement fired`.

---

## Verdict

- **Safe to commit** Track 1 code on `feat/protection-and-ia`.  
- **Phase 2 staging gate (G2–G6 + game exclusion §5.2):** still needs your manual pass on extension + migration.  
- **Do not DNS cutover** until G6 green on staging hostnames ([phases.md](../phases.md)).
