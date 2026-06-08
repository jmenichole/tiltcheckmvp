# Protection Tracks 1–2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship game exclusion + tilt sensitivity wiring + onboarding (Track 1), then nav/bonuses IA cleanup (Track 2). Track 3 (license check) follows separately per P3 spec.

**Architecture:** Extend `user_settings` JSON + existing `/user/settings` API; extension syncs config via background worker; content script runs `GameExclusionWatcher` + profile-aware `TiltDetector`; replace fixed sidebar with draggable FAB + expandable stats panel. Track 2 is web-only nav + bonuses dedup.

**Tech Stack:** Supabase migrations, Hono API, `@tiltcheck/shared`, Chrome MV3 extension, Next.js App Router, Playwright e2e.

**Build order:** A → B → C → D → E (Track 1), then F → G → H (Track 2). Parallelize B/C only after A merges.

**Specs:** [game-exclusion](../specs/2026-05-28-tilt-sensitivity-game-exclusion-design.md), [site-ia](../specs/2026-05-28-site-ia-bonuses-design.md)

---

## Track 1 — Game exclusion & protection (Phases A–E)

### Task A1: DB migration

**Files:**
- Create: `supabase/migrations/20260528120000_game_exclusions.sql`

```sql
alter table user_settings
  add column if not exists game_exclusions jsonb not null default '[]'::jsonb,
  add column if not exists onboarding_completed_at timestamptz;
```

- [ ] Apply migration locally if Supabase CLI available

### Task A2: Shared types + game-exclusion module

**Files:**
- Modify: `packages/shared/src/types.ts`
- Create: `packages/shared/src/game-exclusion.ts` — presets, `matchGameExclusion`, `validateGameExclusions`, `patternsFromGameUrl`
- Create: `packages/shared/src/game-exclusion.test.ts` — node:test
- Modify: `packages/shared/src/index.ts`, `packages/shared/package.json` (`"test": "node --test dist/game-exclusion.test.js"`)

### Task A3: DB layer merge-patch

**Files:**
- Modify: `packages/db/src/index.ts` — map `game_exclusions`, `onboarding_completed_at`; merge partial PATCH (don't reset omitted fields)

### Task A4: API validation

**Files:**
- Modify: `apps/api/src/routes/user.ts` — accept `gameExclusions`, `onboardingCompletedAt`; return 400 on validation errors from shared

### Task A5: Verify

- [ ] `pnpm --filter @tiltcheck/shared build && pnpm --filter @tiltcheck/shared test`
- [ ] `pnpm typecheck`

---

### Task B1: Tilt sensitivity radio cards

**Files:**
- Modify: `apps/web/src/app/(app)/settings/page.tsx` — replace dropdown with 3 cards + copy from spec §4

### Task B2: Game exclusion UI

**Files:**
- Create: `apps/web/src/components/GameExclusionEditor.tsx` — presets toggle, custom keywords, paste URL, block/warn per row
- Modify: settings page — wire editor, save `gameExclusions`

---

### Task C1: Background settings sync

**Files:**
- Modify: `apps/extension/src/background.ts` — `sync-user-config` fetches `/user/settings`, stores `tc_risk_profile`, `tc_game_exclusions`, etc.
- Modify: `apps/extension/src/vault-sync.ts` or new `settings-sync.ts`

### Task C2: TiltDetector profiles

**Files:**
- Modify: `apps/extension/src/tilt-detector.ts` — constructor accepts profile; threshold table from spec §2.2

### Task C3: GameExclusionWatcher

**Files:**
- Create: `apps/extension/src/game-exclusion-watcher.ts`
- Modify: `apps/extension/src/content.ts` — wire watcher, demo mode, enforcement

### Task C4: Draggable FAB panel (§3.5)

**Files:**
- Rewrite: `apps/extension/src/sidebar.ts` — collapsed chip, drag persist `tc_panel_position`, expanded stats sections
- Optional: `manifest.json` side_panel + `sidepanel.html` if time in v1

### Task C5: Extension build

- [ ] `node build.js` in `apps/extension`

---

### Task D1: Dashboard onboarding wizard

**Files:**
- Create: `apps/web/src/components/OnboardingWizard.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx` — show when `!onboardingCompletedAt`

### Task D2: Extension setup page

**Files:**
- Modify: `apps/web/src/app/extension/page.tsx` — checklist steps

---

### Task E1: Playwright settings e2e

**Files:**
- Create: `apps/web/e2e/settings-protection.spec.ts`

### Task E2: Manual staging gate

- [ ] Checklist from spec §5.2

---

## Track 2 — Nav & bonuses (Phases F–H) — after Track 1 E complete

### Task F1: Nav cleanup

**Files:**
- Modify: `apps/web/src/lib/nav-menu.ts`
- Modify: `apps/web/src/components/SiteNav.tsx` — header install icon

### Task G1: Bonuses dedup + fallback banner

**Files:**
- Modify: `apps/api/src/routes/bonuses.ts` or shared dedup helper
- Modify: `apps/web/src/app/bonuses/page.tsx`, `BonusGrid.tsx`

### Task H1: Tool page renames

**Files:**
- Rename copy on domain-verifier, stake, nuts pages per spec §4

---

## Track 3 — License check (P3)

Separate plan after Track 2 — see [license-check spec](../specs/2026-05-28-license-check-design.md).
