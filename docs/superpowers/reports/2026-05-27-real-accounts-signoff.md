# Real-accounts sign-off — TiltCheck extension + web

**Date:** 2026-05-27  
**Branch:** `main`  
**Hosts:** Production Railway (until staging DNS)  
**Tester:** _______________  
**Accounts used:** Stake.us ___ / nuts.gg ___ (real, logged-in)

---

## Pre-flight (5 min)

| # | Step | Pass | Notes |
|---|------|------|-------|
| P1 | Supabase migration `20260528120000_game_exclusions.sql` applied | [ ] | Required for game blocks in API |
| P2 | Build extension: `cd apps/extension && node build.js` | [ ] | Prod URLs baked in by default |
| P3 | Chrome → Load unpacked `apps/extension/dist` | [ ] | Disable old Tampermonkey autovault if testing extension AV |
| P4 | `GET https://tiltcheck-api-production.up.railway.app/health` → OK | [ ] | |
| P5 | Web loads: `https://tiltcheckmvp-production.up.railway.app` | [ ] | |

**URLs**

| Service | URL |
|---------|-----|
| Web | `https://tiltcheckmvp-production.up.railway.app` |
| API | `https://tiltcheck-api-production.up.railway.app` |
| Settings (game blocks) | `/settings#game-exclusion` |
| Dashboard (lockout) | `/dashboard` |

---

## A. Auth + sync

| # | Step | Pass | Notes |
|---|------|------|-------|
| A1 | Web `/login` → Discord → lands on dashboard with session | [ ] | |
| A2 | Extension panel → **Connect Discord** → username shown | [ ] | |
| A3 | DevTools → Extension storage: `tc_session_token` set, `tc_demo: false` | [ ] | |
| A4 | Panel **Refresh rules** → status “Rules refreshed” | [ ] | |
| A5 | After refresh, game block count matches web Settings | [ ] | |

---

## B. Game blocks (web only — not editable in extension)

| # | Step | Pass | Notes |
|---|------|------|-------|
| B1 | Web **Settings** → add preset (e.g. Blackjack) → **Save** | [ ] | |
| B2 | Reload Settings page → block still listed | [ ] | |
| B3 | Extension → **Refresh rules** → count updates | [ ] | |
| B4 | Open casino URL matching block (e.g. `…/blackjack`) | [ ] | |
| B5 | **Warn** countdown appears (if mode = warn) OR immediate **block** overlay | [ ] | |
| B6 | Demo mode ON → banner only, no hard block / no Touch Grass | [ ] | |
| B7 | Logout → login → blocks still in Settings | [ ] | |

---

## C. Tilt warnings + Touch Grass lockout

**Prereq:** Dashboard or extension saves **lockout time** (session cap armed). Demo mode **off**.

| # | Step | Pass | Notes |
|---|------|------|-------|
| C1 | Set lockout time in extension (e.g. 5 min) → **Save** → armed in panel | [ ] | |
| C2 | **Conservative** profile on web Settings → Refresh rules | [ ] | |
| C3 | Fast-click on casino tab → **Stage 1** banner (“Take a breath…”) | [ ] | |
| C4 | Continue → **Stage 2** banner (“One more spike…”) | [ ] | |
| C5 | Continue → **Touch Grass** fullscreen `#tiltcheck-lockdown-root` | [ ] | |
| C6 | Bets/spins blocked until timer ends; no early dismiss | [ ] | |
| C7 | SW console: `[TiltCheck] Enforcement fired` | [ ] | |
| C8 | **Degen** profile → warnings start later (high/critical only) | [ ] | Optional |

---

## D. Extension panel UX

| # | Step | Pass | Notes |
|---|------|------|-------|
| D1 | Expand TC chip → panel opens | [ ] | |
| D2 | **−** minimizes back to circle | [ ] | |
| D3 | Drag by title bar only (minimize still clicks) | [ ] | |
| D4 | Game-exclusion warn does not re-expand after you minimized | [ ] | |

---

## E. AutoVault — Stake.us (real account, small stakes)

**Use a session you can afford to test; skim % low (e.g. 5–10%).**

| # | Step | Pass | Notes |
|---|------|------|-------|
| E1 | `stake.us` logged in → **TC · AutoVault · Stake.us** panel visible | [ ] | Top-right, separate from tilt FAB |
| E2 | Onboarding → set skim % → **Get started** | [ ] | |
| E3 | **AUTOVAULT ON** → status “Watching SC” (or active currency) | [ ] | |
| E4 | Small win or balance bump → vault deposit in Stake vault (check Stake vault UI) | [ ] | |
| E5 | “X vaulted” stat increments | [ ] | |
| E6 | Long-press master → kill switch stops monitoring | [ ] | |
| E7 | Config survives extension reload | [ ] | `chrome.storage` |

---

## F. AutoVault — nuts.gg (real account)

| # | Step | Pass | Notes |
|---|------|------|-------|
| F1 | `nuts.gg` logged in → panel shows **· nuts.gg** (auto site detect) | [ ] | |
| F2 | Status includes “nuts.tools socket ready” after play/connect | [ ] | MAIN-world WS hook |
| F3 | **AUTOVAULT ON** → small win → SOL vaulted on nuts | [ ] | |
| F4 | Navigate Stake tab → nuts tab: correct engine label per site | [ ] | |

---

## G. Regression (do not break)

| # | Step | Pass | Notes |
|---|------|------|-------|
| G1 | Tilt FAB + AutoVault panel both usable on stake.us | [ ] | Separate z-index/position |
| G2 | Non-casino sites: tilt panel only, no AutoVault panel | [ ] | |
| G3 | Logged out: no enforcement, demo warnings OK | [ ] | |

---

## Verdict

| Area | Status | Blocker |
|------|--------|---------|
| Auth + sync | [ ] PASS / [ ] FAIL | |
| Game blocks (web → extension) | [ ] PASS / [ ] FAIL | |
| Tilt warnings + lockout | [ ] PASS / [ ] FAIL | |
| AutoVault Stake | [ ] PASS / [ ] FAIL / [ ] SKIP | |
| AutoVault nuts | [ ] PASS / [ ] FAIL / [ ] SKIP | |

**Sign-off:** [ ] **APPROVED for prod DNS / CWS update** — [ ] **NOT APPROVED** (see blockers)

**Blockers / notes:**

```
(fill in)
```

---

## Quick troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Game blocks always 0 after Refresh | Migration not applied; or Settings save failed — check Network PATCH `/user/settings` |
| Blocks on web but not enforced | Forgot **Refresh rules**; or `tc_demo: true` |
| No Touch Grass | Demo on; lockout not armed; or sensitivity too low for test pattern |
| AutoVault no vault on Stake | Not logged in; CF challenge (wait 60s); skim % 0 |
| nuts “Socket not ready” | Refresh page; open a game so WS connects |
