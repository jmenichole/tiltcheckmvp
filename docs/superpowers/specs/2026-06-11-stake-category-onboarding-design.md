# Stake Category Onboarding — Design Spec

**Date:** 2026-06-11  
**Status:** Approved  
**Trigger:** Full-project audit + user examples (`/casino/group/stake-originals`, `/casino/group/scratch-cards`)  
**Related:** [2026-05-28-tilt-sensitivity-game-exclusion-design.md](./2026-05-28-tilt-sensitivity-game-exclusion-design.md), [2026-06-11-audit-remediation.md](../plans/2026-06-11-audit-remediation.md)

---

## 1. Problem & goal

**Problem**

| Gap | Today |
|-----|--------|
| Onboarding Games step | Generic presets (blackjack, crash, slots) via substring match on URL + title |
| Stake URL shape | Category lobbies at `/casino/group/{slug}`; games at `/casino/games/{slug}` |
| Matcher | Substring only — category lobby blocks do not cover direct game links; generic keywords false-positive |

**Goal**

1. Replace onboarding **Games** step with **Stake traps** — category cards aligned to stake.us navigation.
2. Upgrade matcher so patterns starting with `/` use **pathname prefix** rules on stake.us.
3. Persist as normal `GameExclusionEntry[]` with `source: 'stake_category'` — no parallel API model.
4. Keep wizard at **6 steps**; generic presets remain in Settings only.

**Non-goals (v1)**

- nuts.gg or multi-venue category catalogs
- Auto-scrape / API sync of Stake game list
- Per-game picker inside onboarding (Settings URL paste still available)
- Server-side enforcement (extension only)

---

## 2. Product model

### 2.1 Wizard flow (6 steps)

| Step | Name | Change |
|------|------|--------|
| 1 | Welcome | — |
| 2 | Your pattern | Pre-selects Stake categories + sensitivity/cap defaults |
| 3 | **Stake traps** | **Replaces Games** |
| 4 | Tilt sensitivity | — |
| 5 | Session cap | — |
| 6 | Done | Extension web-sync copy (existing) |

### 2.2 Block mode UX

- **Default mode** dropdown: Block / Warn — applies to all selected categories.
- **Per-category override:** expand card → optional Block / Warn override for that category only.
- Implementation: each selected category becomes one `GameExclusionEntry` with its resolved `mode`.

### 2.3 Trap pattern → category pre-select

| Trap pattern | Pre-checked categories | Default mode bias |
|--------------|------------------------|-------------------|
| `game_trap` | Originals, Scratch Cards | block |
| `autopilot` | Originals, Slots | warn |
| `chase` | All five | block |
| `heater` | Originals, Slots | warn |
| `skip` | None | block |

Trap step continues to set `riskProfile`, `sessionCapMinutes`, `lockoutStyle` as today.

### 2.4 PMF / RG framing

- Lead with **proactive** category blocks (antecedent management) before tilt sensitivity.
- Copy: outcomes (“wrong lobby / game”) not clinical RG language.
- Zero categories allowed at finish with honest nudge to Settings — do not block wizard completion.

---

## 3. Stake category catalog (v1)

**File:** `packages/shared/src/stake-categories.ts`

```typescript
export type StakeCategoryId =
  | 'stake-originals'
  | 'scratch-cards'
  | 'slots'
  | 'live-casino'
  | 'table-games';

export type StakeCategoryBlock = {
  id: StakeCategoryId;
  label: string;
  copy: string;
  pathPrefixes: string[]; // all lowercase, start with /
};
```

### 3.1 Category definitions

| ID | Label | Group prefix | Game path prefixes (curated v1) |
|----|-------|--------------|----------------------------------|
| `stake-originals` | Stake Originals | `/casino/group/stake-originals` | `/casino/games/plinko`, `/casino/games/dice`, `/casino/games/limbo`, `/casino/games/crash`, `/casino/games/mines`, `/casino/games/keno`, `/casino/games/wheel`, `/casino/games/hilo`, `/casino/games/dragon-tower`, `/casino/games/diamonds` |
| `scratch-cards` | Scratch Cards | `/casino/group/scratch-cards` | `/casino/games/scratch` (prefix covers scratch-* slugs via pathname prefix on parent path — use explicit slugs as discovered on staging) |
| `slots` | Slots | `/casino/group/slots` | Add top 8–12 slot slugs verified on stake.us staging |
| `live-casino` | Live Casino | `/casino/group/live-casino` | `/casino/games/live-blackjack`, `/casino/games/live-roulette`, `/casino/games/live-baccarat` (verify slugs on staging) |
| `table-games` | Table Games | `/casino/group/table-games` | `/casino/games/blackjack`, `/casino/games/roulette`, `/casino/games/baccarat` (verify slugs on staging) |

**Maintenance:** Update `pathPrefixes` in one file when Stake adds games; no DB migration.

### 3.2 Expansion to exclusions

```typescript
export function stakeCategoryToExclusion(
  category: StakeCategoryBlock,
  mode: GameExclusionMode,
): GameExclusionEntry {
  return {
    id: `stake-cat-${category.id}`,
    label: category.label,
    matchPatterns: [...category.pathPrefixes],
    mode,
    source: 'stake_category',
  };
}

export function buildStakeCategoryExclusions(
  selected: StakeCategoryId[],
  defaultMode: GameExclusionMode,
  overrides: Partial<Record<StakeCategoryId, GameExclusionMode>>,
): GameExclusionEntry[];
```

On finish, merge with existing `keywords` / `url` exclusions from settings; **replace** prior `stake_category` and `preset` entries from onboarding (presets no longer written by wizard).

---

## 4. Matcher upgrade

**File:** `packages/shared/src/game-exclusion.ts`

### 4.1 Path-prefix rules

```typescript
export function pathnameMatchesPrefix(pathname: string, prefix: string): boolean {
  const p = prefix.toLowerCase();
  const path = pathname.toLowerCase();
  return path === p || path.startsWith(p + '/');
}

export function matchGameExclusionOnStake(
  pathname: string,
  haystack: string,
  entries: GameExclusionEntry[],
): GameExclusionEntry | null;
```

Algorithm (first match wins):

1. For each entry, for each pattern:
   - If pattern starts with `/` → `pathnameMatchesPrefix(pathname, pattern)`
   - Else → `haystack.includes(pattern)` (existing behavior)
2. Return first matching entry.

### 4.2 Extension integration

**File:** `apps/extension/src/game-exclusion-watcher.ts`

- In `check()`, pass `location.pathname` into matcher when `location.hostname` is `stake.us` or `www.stake.us`.
- Other hostnames: substring haystack only (legacy presets + keywords).

**File:** `apps/extension/src/content.ts` — no enforcement gate changes.

### 4.3 Tests

**File:** `packages/shared/src/game-exclusion.test.ts`

| Case | Expected |
|------|----------|
| `/casino/group/stake-originals` + originals entry | match |
| `/casino/games/plinko` + originals entry | match |
| `/casino/games/blackjack` + originals only | no match |
| `blackjack` keyword + haystack title | match (substring) |
| `/casino/group/slots/extra` | match slots group prefix |

---

## 5. Web UI

### 5.1 New component

**File:** `apps/web/src/components/StakeCategoryPicker.tsx`

Props:

```typescript
type Props = {
  selected: Set<StakeCategoryId>;
  defaultMode: GameExclusionMode;
  overrides: Partial<Record<StakeCategoryId, GameExclusionMode>>;
  onChangeSelected: (next: Set<StakeCategoryId>) => void;
  onChangeDefaultMode: (mode: GameExclusionMode) => void;
  onChangeOverride: (id: StakeCategoryId, mode: GameExclusionMode | undefined) => void;
};
```

UI:

- Reuse `sensitivity-card-grid` / `onboarding-preset-grid` patterns from `globals.css`
- Default mode `<select>` above grid
- Each card: checkbox, title, copy, optional `<details>` for mode override
- Footer link: `Settings → Game blocks` for custom URL/keywords

### 5.2 OnboardingWizard changes

**File:** `apps/web/src/components/OnboardingWizard.tsx`

- Rename step label: `Games` → `Stake traps`
- Remove `GAME_EXCLUSION_PRESETS` / `enabledPresets` / `presetMode` state
- Add `selectedCategories`, `categoryDefaultMode`, `categoryOverrides`
- `applyTrapDefaults()` sets `selectedCategories` instead of `enabledPresets`
- `finishWizard()` calls `buildStakeCategoryExclusions()` + merges non-`stake_category` / non-`preset` custom entries from initial settings

### 5.3 Settings (minimal v1)

**File:** `apps/web/src/components/GameExclusionEditor.tsx`

- Display badge `Stake category` when `source === 'stake_category'`
- No new editor flow in v1 — user removes or changes mode; add categories by re-running onboarding or future settings picker

---

## 6. Types & validation

**File:** `packages/shared/src/types.ts`

```typescript
export type GameExclusionSource = 'preset' | 'keywords' | 'url' | 'stake_category';
```

**File:** `packages/shared/src/game-exclusion.ts` — `validateGameExclusions` accepts `stake_category` in source union.

API and DB: no migration — `game_exclusions` JSONB stores entries as today.

---

## 7. Error handling

| Case | Behavior |
|------|----------|
| No categories selected | Allow finish; show copy on Done step + dashboard pillar “None yet” |
| > 20 exclusions after merge | Validate on PATCH; wizard caps at 5 categories |
| User on non-Stake casino | Stake path rules ignored; keywords/url still work |
| Catalog slug wrong | No match until catalog updated — document staging verification in ship gate |

---

## 8. Ship gate (staging)

1. Complete onboarding with Originals + Scratch Cards selected, block mode, finish wizard.
2. Extension synced, demo off, session cap armed.
3. Open `https://stake.us/casino/group/stake-originals` → block or warn fires.
4. Open `https://stake.us/casino/games/plinko` (or verified slug) → same.
5. Open unrelated stake page → no block.
6. Settings shows two `stake_category` entries with correct labels.

---

## 9. File index

| File | Action |
|------|--------|
| `packages/shared/src/stake-categories.ts` | Create |
| `packages/shared/src/stake-categories.test.ts` | Create |
| `packages/shared/src/types.ts` | Add `stake_category` source |
| `packages/shared/src/game-exclusion.ts` | Path-prefix matcher |
| `packages/shared/src/game-exclusion.test.ts` | Prefix tests |
| `packages/shared/src/index.ts` | Export stake categories |
| `apps/web/src/components/StakeCategoryPicker.tsx` | Create |
| `apps/web/src/components/OnboardingWizard.tsx` | Replace Games step |
| `apps/web/src/components/GameExclusionEditor.tsx` | Badge for stake_category |
| `apps/extension/src/game-exclusion-watcher.ts` | Pass pathname on stake.us |

---

## Spec self-review

- [x] No TBD placeholders in scope sections (scratch/slots slugs: verify on staging — explicit ship gate step)
- [x] Consistent with existing `GameExclusionEntry` model and extension sync
- [x] Single bounded feature set (Stake v1, onboarding + matcher + minimal settings badge)
- [x] Matcher behavior explicit: `/` prefix vs substring
- [x] Does not duplicate audit remediation auth work

---

## Next step

Invoke **writing-plans** skill → `docs/superpowers/plans/2026-06-11-stake-category-onboarding.md`
