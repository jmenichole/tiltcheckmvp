# Past You Pact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Touch Grass and critical enforcement feel like the user’s own saved pact — agency copy, optional private note, friction-first path, opt-in snooze — without removing real protected-session enforcement.

**Architecture:** Extend `session_cap` vault rule `config` with pact fields; centralize parsing in `@tiltcheck/shared` + `vault-sync.ts`; split extension enforcement into `enforcement.ts` (Touch Grass overlay) and new `friction.ts` (first-strike screen); route lockout vs friction in `content.ts` via `sessionStorage` session flags; dashboard “My Line” saves full config in one POST.

**Tech Stack:** TypeScript monorepo (pnpm), Hono vault API, Chrome MV3 extension, Next.js dashboard, node:test for shared helpers.

**Spec:** [2026-05-27-past-you-pact-design.md](../specs/2026-05-27-past-you-pact-design.md)

**Build order:** Phase 2.5 (overlay + note + web save) → Phase 3a (API validation + sync) → Phase 3b (friction + snooze). Ship 2.5 before 3b; 3a can merge with 2.5 if done together.

---

## File map

| File | Responsibility |
|------|----------------|
| `packages/shared/src/session-cap.ts` | `SessionCapConfig` type, `normalizeSessionCapConfig()`, defaults |
| `packages/shared/src/session-cap.test.ts` | Unit tests for normalize/defaults |
| `apps/api/src/routes/vault.ts` | Use shared normalizer on POST/PATCH |
| `apps/extension/src/vault-sync.ts` | Typed config on `VaultRuleSnapshot`, `getSessionCapConfig()` |
| `apps/extension/src/enforcement.ts` | Touch Grass overlay with pact hierarchy |
| `apps/extension/src/friction.ts` | First-strike friction screen + snooze button |
| `apps/extension/src/session-enforcement.ts` | Route critical → friction vs Touch Grass; session flags |
| `apps/extension/src/content.ts` | Call router instead of raw `triggerTouchGrassTimeout` |
| `apps/extension/src/game-exclusion-watcher.ts` | Same router for game blocks |
| `apps/extension/src/tilt-education.ts` | `formatTiltEducation()` — pattern label, metric, insight from indicator + live stats |
| `apps/extension/src/tilt-detector.ts` | Enrich indicators with counts for education formatter |
| `apps/web/src/app/(app)/dashboard/page.tsx` | “My Line” fields |
| `apps/web/src/components/OnboardingWizard.tsx` | Optional pact fields on cap step |

**Session flags (`sessionStorage`):**

| Key | Meaning |
|-----|---------|
| `tc_friction_used` | `'1'` after first critical handled with friction (not full lockout) |
| `tc_snooze_used` | `'1'` after user consumes snooze |

Reset on tab close (default `sessionStorage` lifetime). Cleared on `beforeunload` optional cleanup not required.

---

## Phase 2.5 — Pact overlay + note (ship first)

### Task 1: Shared session cap config

**Files:**
- Create: `packages/shared/src/session-cap.ts`
- Create: `packages/shared/src/session-cap.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add types and normalizer**

```typescript
// packages/shared/src/session-cap.ts
export type LockoutStyle = 'hard_stop' | 'friction_first';

export type SessionCapConfig = {
  durationMinutes: number;
  lockoutStyle: LockoutStyle;
  snoozeEnabled: boolean;
  futureMeNote: string;
};

const DEFAULTS: SessionCapConfig = {
  durationMinutes: 10,
  lockoutStyle: 'friction_first',
  snoozeEnabled: false,
  futureMeNote: '',
};

export function normalizeSessionCapConfig(raw: Record<string, unknown> = {}): SessionCapConfig {
  const durationRaw =
    typeof raw.durationMinutes === 'number'
      ? raw.durationMinutes
      : typeof raw.maxMinutes === 'number'
        ? raw.maxMinutes
        : DEFAULTS.durationMinutes;
  const durationMinutes = Math.min(60, Math.max(1, Math.trunc(durationRaw)));
  const lockoutStyle =
    raw.lockoutStyle === 'hard_stop' ? 'hard_stop' : 'friction_first';
  const snoozeEnabled = raw.snoozeEnabled === true;
  let futureMeNote = typeof raw.futureMeNote === 'string' ? raw.futureMeNote.trim() : '';
  if (futureMeNote.length > 140) futureMeNote = futureMeNote.slice(0, 140);
  return { durationMinutes, lockoutStyle, snoozeEnabled, futureMeNote };
}
```

- [ ] **Step 2: Tests**

```typescript
// packages/shared/src/session-cap.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSessionCapConfig } from './session-cap.js';

describe('normalizeSessionCapConfig', () => {
  it('defaults friction_first and no snooze', () => {
    const c = normalizeSessionCapConfig({});
    assert.equal(c.durationMinutes, 10);
    assert.equal(c.lockoutStyle, 'friction_first');
    assert.equal(c.snoozeEnabled, false);
  });
  it('truncates note to 140', () => {
    const c = normalizeSessionCapConfig({ futureMeNote: 'x'.repeat(200) });
    assert.equal(c.futureMeNote.length, 140);
  });
});
```

- [ ] **Step 3: Export and verify**

Run: `pnpm --filter @tiltcheck/shared build && pnpm --filter @tiltcheck/shared test`  
Expected: PASS

---

### Task 2: API vault uses shared normalizer

**Files:**
- Modify: `apps/api/src/routes/vault.ts`

- [ ] Replace local `normalizeSessionCapConfig` with import from `@tiltcheck/shared`:

```typescript
import { normalizeSessionCapConfig } from '@tiltcheck/shared';

// in validateRulePayload return:
config: normalizeSessionCapConfig(body.config ?? {}) as Record<string, unknown>,
```

- [ ] **Verify:** POST `/vault` with `{ ruleType: 'session_cap', config: { durationMinutes: 15, futureMeNote: 'walk away', lockoutStyle: 'hard_stop' } }` returns normalized config in rules list.

Run: `pnpm typecheck`

---

---

### Task 3: Tilt pattern education (spec §5.5)

**Files:**
- Create: `apps/extension/src/tilt-education.ts`
- Modify: `apps/extension/src/tilt-detector.ts`
- Modify: `apps/extension/src/tilt-warnings.ts`
- Modify: `apps/extension/src/sidebar.ts`
- Modify: `apps/extension/src/enforcement.ts` (trigger card uses education bundle)

- [ ] **Step 1: Enrich indicators with metrics**

```typescript
// tilt-detector.ts — add to TiltIndicator
export interface TiltIndicator {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  metricValue?: number; // clicks in 5s or loss count
}
```

Set `metricValue` in `detectFastClicks` / loss branch.

- [ ] **Step 2: Education formatter**

```typescript
// tilt-education.ts
export type TiltEducation = {
  patternLabel: string;
  headline: string;
  metricLine: string;
  insightLine: string;
  triggerCard: string; // full block for overlay
};

export function formatTiltEducation(
  indicator: TiltIndicator,
  profile: RiskProfile,
): TiltEducation {
  if (indicator.type === 'fast_clicks') {
    const n = indicator.metricValue ?? 0;
    return {
      patternLabel: 'Autopilot clicks',
      headline: `Autopilot clicks — pace is climbing`,
      metricLine: `${n} clicks in 5s · ${profile} sensitivity`,
      insightLine: 'Pace picked up — that\'s tilt speed, not bad luck.',
      triggerCard: `Pattern: autopilot clicks · ${n} clicks in 5s`,
    };
  }
  // chasing_losses branch...
}
```

- [ ] **Step 3: Wire to toasts** — `showPageToast` gets `sub` = metricLine + insight (or two-line sub)

- [ ] **Step 4: Wire to sidebar** — `alertLine()` uses pattern + live click count when indicator active

- [ ] **Step 5: Wire to Touch Grass / friction** — `triggerCard` + `insightLine` in trigger card

- [ ] **Verify:** Rapid click on staging → pulse shows count; lockout trigger card names pattern + number

Ship with Phase 2.5 (same PR as overlay) or immediately after Task 3.

---

### Task 4: Touch Grass overlay — Past You hierarchy

**Files:**
- Modify: `apps/extension/src/enforcement.ts`

- [ ] **Step 1: Extend signature**

```typescript
export type TouchGrassOptions = {
  triggerReason: string;
  durationMs: number;
  durationMinutes: number;
  futureMeNote?: string;
};

export function triggerTouchGrassTimeout(opts: TouchGrassOptions): void {
  const { triggerReason, durationMs, durationMinutes, futureMeNote } = opts;
  // ... existing guard overlayActive ...
```

- [ ] **Step 2: Replace innerHTML body** (keep timer logic)

Key blocks in order:
1. Tagline (small): `TiltCheck · Made for degens`
2. If `futureMeNote`: quote block with note text (prominent)
3. Pact line: `Your line: ${durationMinutes} min · you set this in Settings`
4. H1: `Touch Grass` (smaller than today if needed)
5. Sub: `Tab locked before the hole got deeper.`
6. Trigger card header: `What triggered this` (not “Why you are here”)
7. Trigger text: `${triggerReason}`
8. Timer + footer with link to touch-grass page (`webBaseUrl()` from config)

- [ ] **Step 3: Keep backward compat shim** (optional one release)

```typescript
/** @deprecated use TouchGrassOptions object */
export function triggerTouchGrassTimeoutLegacy(reason: string, durationMs: number): void {
  triggerTouchGrassTimeout({
    triggerReason: reason,
    durationMs,
    durationMinutes: Math.max(1, Math.round(durationMs / 60000)),
  });
}
```

Update all call sites in same PR to use object form — prefer no legacy if only 2 call sites.

- [ ] **Build:** `cd apps/extension && node build.js`

---

### Task 5: Vault-sync typed config + push helper

**Files:**
- Modify: `apps/extension/src/vault-sync.ts`

- [ ] Extend snapshot and helpers:

```typescript
import type { SessionCapConfig } from '@tiltcheck/shared';
import { normalizeSessionCapConfig } from '@tiltcheck/shared';

export interface VaultRuleSnapshot {
  ruleType: string;
  enabled: boolean;
  config: SessionCapConfig & Record<string, unknown>;
}

export function getSessionCapConfig(rules: VaultRuleSnapshot[]): SessionCapConfig {
  const cap = rules.find((r) => r.ruleType === 'session_cap' && r.enabled);
  return normalizeSessionCapConfig(cap?.config ?? {});
}

export function sessionCapDurationMs(rules: VaultRuleSnapshot[]): number {
  return getSessionCapConfig(rules).durationMinutes * 60 * 1000;
}

export async function pushSessionCapConfig(
  token: string,
  config: Partial<SessionCapConfig>,
): Promise<{ ok: true; rules: VaultRuleSnapshot[] } | { ok: false; error: string }> {
  const merged = normalizeSessionCapConfig(config as Record<string, unknown>);
  // POST same as pushSessionCapMinutes but body.config = merged
}
```

- [ ] Deprecate or wrap `pushSessionCapMinutes` to call `pushSessionCapConfig(token, { durationMinutes })`.

---

### Task 6: Wire pact context at call sites (overlay only)

**Files:**
- Modify: `apps/extension/src/content.ts`
- Modify: `apps/extension/src/game-exclusion-watcher.ts`

- [ ] Import `getSessionCapConfig` and pass full opts:

```typescript
const pact = getSessionCapConfig(vaultRules);
triggerTouchGrassTimeout({
  triggerReason: indicator.description,
  durationMs: sessionCapDurationMs(vaultRules),
  durationMinutes: pact.durationMinutes,
  futureMeNote: pact.futureMeNote || undefined,
});
```

Same pattern for game block reason string.

- [ ] **Manual test:** Arm cap with note on staging → critical tilt → note + pact line visible.

---

### Task 7: Dashboard “My Line” UI

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`
- Modify: `apps/web/src/components/OnboardingWizard.tsx` (cap step only)

- [ ] Add state: `lockoutStyle`, `snoozeEnabled`, `futureMeNote`
- [ ] Load from `sessionCapRule.config` via `normalizeSessionCapConfig`
- [ ] UI under Vault tab:

| Control | Element |
|---------|---------|
| Minutes | existing number input |
| When critical hits | radio: Friction first / Hard stop |
| One snooze per session | checkbox (default off) |
| Note to future me | textarea maxlength 140 |

- [ ] `saveSessionCap` POST full config object
- [ ] Helper text: *When autopilot hits, past you wanted a break — not a lecture.*

- [ ] **Verify:** Save → refresh → values persist → extension Sync → lockout shows note

---

### Task 8: Phase 2.5 sign-off

- [ ] All copy matches spec §5.4 Ally voice (facts first, no shame, no clinical RG)
- [ ] Demo mode: still no lockout
- [ ] `pnpm typecheck`
- [ ] Bump extension manifest patch version
- [ ] Commit: `feat: Past You Pact overlay and My Line settings (phase 2.5)`

---

## Phase 3a — Sync parity (if not merged in 2.5)

### Task 9: Extension reads full config after sync

**Files:**
- Modify: `apps/extension/src/sidebar.ts` — show “Friction first · 10m” or “Hard stop · 10m” in armed line
- Modify: `apps/extension/src/settings-sync.ts` — no change if vault-only

- [ ] Sidebar armed line example: `Armed 10m · friction-first` instead of only `Armed 10m`

---

## Phase 3b — Friction screen + snooze

### Task 10: Session enforcement router

**Files:**
- Create: `apps/extension/src/session-enforcement.ts`

```typescript
import { triggerTouchGrassTimeout, type TouchGrassOptions } from './enforcement.js';
import { triggerFrictionScreen } from './friction.js';
import type { SessionCapConfig } from '@tiltcheck/shared';

const FRICTION_KEY = 'tc_friction_used';
const SNOOZE_KEY = 'tc_snooze_used';

export function resetEnforcementSessionFlags(): void {
  sessionStorage.removeItem(FRICTION_KEY);
  sessionStorage.removeItem(SNOOZE_KEY);
}

export function handleCriticalEnforcement(
  pact: SessionCapConfig,
  triggerReason: string,
  durationMs: number,
): void {
  const touchGrass = () =>
    triggerTouchGrassTimeout({
      triggerReason,
      durationMs,
      durationMinutes: pact.durationMinutes,
      futureMeNote: pact.futureMeNote || undefined,
    });

  if (pact.lockoutStyle === 'hard_stop') {
    touchGrass();
    return;
  }

  if (sessionStorage.getItem(FRICTION_KEY) === '1') {
    touchGrass();
    return;
  }

  sessionStorage.setItem(FRICTION_KEY, '1');
  triggerFrictionScreen({
    pact,
    triggerReason,
    onSnooze: pact.snoozeEnabled && sessionStorage.getItem(SNOOZE_KEY) !== '1'
      ? () => {
          sessionStorage.setItem(SNOOZE_KEY, '1');
        }
      : undefined,
    onComplete: () => {
      /* friction dismissed after 15s — play resumes */
    },
  });
}
```

- [ ] Replace direct `triggerTouchGrassTimeout` in `content.ts` and `game-exclusion-watcher.ts` with `handleCriticalEnforcement`.

**Note:** Game blocks spec says immediate Touch Grass — use `hard_stop` path for game blocks OR pass `forceTouchGrass: true` option. Add to router:

```typescript
export function handleCriticalEnforcement(
  pact: SessionCapConfig,
  triggerReason: string,
  durationMs: number,
  opts?: { forceTouchGrass?: boolean },
): void
```

Game watcher calls with `forceTouchGrass: true` to skip friction (proactive block stays immediate).

---

### Task 11: Friction screen module

**Files:**
- Create: `apps/extension/src/friction.ts`

- [ ] **Behavior:**
  - Fixed overlay, dark dim (`rgba(0,0,0,.85)`), z-index below Touch Grass
  - Same pact note + pact line + trigger card as Touch Grass
  - Headline: `Pause — your line is armed`
  - 15s countdown; `blockBettingUI(true)` until 0
  - Button if `onSnooze`: `Use my one snooze` — dismiss immediately, `blockBettingUI(false)`
  - On countdown complete: remove overlay, `blockBettingUI(false)`
  - No undismissable full lockout timer

- [ ] Reuse styles/colors from `enforcement.ts` (extract shared `pactCardHtml()` to `pact-ui.ts` if duplication > ~30 lines — YAGNI until then)

- [ ] **Build + manual test:** friction_first → 1st critical = friction; 2nd = Touch Grass

---

### Task 12: Last-call pact subline

**Files:**
- Modify: `apps/extension/src/tilt-warnings.ts`

- [ ] Extend `showTiltWarningBanner`:

```typescript
export function showTiltWarningBanner(
  indicator: TiltIndicator,
  stage: 1 | 2,
  demoMode: boolean,
  sessionCapMinutes?: number,
): void {
  // stage 2 sub append:
  // demoMode ? ... : `Your ${sessionCapMinutes ?? '?'} min line is armed.`
```

- [ ] Pass minutes from `content.ts` via `getSessionCapConfig(vaultRules).durationMinutes`

---

### Task 13: Phase 3b tests + sign-off

- [ ] Manual matrix from spec §9 (all rows)
- [ ] Snooze: enabled → friction → snooze → next critical Touch Grass; snooze not offered twice
- [ ] `pnpm typecheck` + extension build
- [ ] Commit: `feat: friction-first enforcement and opt-in snooze (phase 3b)`

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Pact line on overlay | 3, 5 |
| futureMeNote | 1, 6, 3 |
| lockoutStyle | 1, 6, 9 |
| snoozeEnabled | 1, 6, 9, 10 |
| Friction 15s | 10 |
| Second critical → Touch Grass | 9 |
| Game block immediate | 9 forceTouchGrass |
| Tilt pattern education §5.5 | Task 3 |
| Last call subline | 12 |
| Privacy (no $ on overlay) | 3 (no new fields) |
| sessionStorage snooze reset | File map |
| Phase split 2.5 / 3 | Plan sections |

**Open question resolved in plan:** Snooze resets on tab close via `sessionStorage`.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-27-past-you-pact.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — implement tasks in this session with checkpoints after Phase 2.5 and 3b

Which approach do you want?
