# Stake Category Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace onboarding Games step with Stake.us category blocks and path-prefix matching on stake.us.

**Architecture:** Catalog + expansion live in `@tiltcheck/shared`. Matcher uses pathname prefix for `/` patterns on stake.us; substring elsewhere. Wizard writes `source: 'stake_category'` entries; extension watcher unchanged except matcher call.

**Tech Stack:** TypeScript, `@tiltcheck/shared`, Next.js, Chrome MV3 extension, node:test

**Spec:** `docs/superpowers/specs/2026-06-11-stake-category-onboarding-design.md`

---

### Task 1: Shared types + stake category catalog

**Files:** `packages/shared/src/types.ts`, `packages/shared/src/stake-categories.ts`, `packages/shared/src/stake-categories.test.ts`, `packages/shared/src/index.ts`

Implement catalog, `buildStakeCategoryExclusions`, tests. Add `stake_category` to `GameExclusionSource`.

---

### Task 2: Path-prefix matcher

**Files:** `packages/shared/src/game-exclusion.ts`, `packages/shared/src/game-exclusion.test.ts`

Add `pathnameMatchesPrefix`, `matchGameExclusionForPage(pathname, haystack, entries, isStakeHost)`. Update `validateGameExclusions` for `stake_category` source.

---

### Task 3: Extension watcher

**Files:** `apps/extension/src/game-exclusion-watcher.ts`

Use new matcher with `stake.us` hostname check. Rebuild extension.

---

### Task 4: StakeCategoryPicker + OnboardingWizard

**Files:** `apps/web/src/components/StakeCategoryPicker.tsx`, `apps/web/src/components/OnboardingWizard.tsx`

Replace Games step; trap defaults pre-select categories.

---

### Task 5: Settings badge

**Files:** `apps/web/src/components/GameExclusionEditor.tsx`

Show "Stake category" badge when `source === 'stake_category'`.

---

### Task 6: Verify

Run `pnpm --filter @tiltcheck/shared test`, `cd apps/extension && node build.js`, `pnpm --filter @tiltcheck/web build`.
