# Tilt Sensitivity, Game Self-Exclusion & Onboarding (Design Spec)

**Date:** 2026-05-28  
**Status:** Approved  
**Trigger:** User feedback — tilt sensitivity unclear; per-game self-exclusion may be higher value than tilt detection alone  
**Related:** [phases.md](../../phases.md), [2026-06-07-phase-2-protected-session-design.md](./2026-06-07-phase-2-protected-session-design.md)

---

## 1. Problem & goal

**Problem**

| Gap | Today |
|-----|--------|
| Tilt sensitivity | Three labels in `/settings` with one-line hints; **extension ignores `riskProfile`** — hardcoded click/loss thresholds |
| Game self-exclusion | **Does not exist** in v2 (API, DB, web, extension) |
| Onboarding | `/extension` is install blurb only; no first-run wizard |
| Product clarity | Users don't understand what TiltCheck does until they already know |

**Goal**

1. **Explain** each tilt sensitivity level so users can choose confidently.
2. **Ship per-game self-exclusion** — user picks games and **block vs warn** per game; extension enforces on casino tabs.
3. **First-login wizard** + persistent config in **Settings**, **Dashboard**, and **extension sidebar**.
4. **Tested end-to-end:** save → sync → enforce on staging casino tab.

**Non-goals (v1 of this spec)**

- Regulator-style account self-exclusion (casino account lockout with operator)
- Per-casino operator API integration
- ML game classification from screenshots
- Mobile app

---

## 2. Product model

### 2.1 Two protection modes (user mental model)

| Mode | When it fires | User value |
|------|----------------|------------|
| **Tilt detection** | Behavior gets hot (clicks, losses) | Reactive — catches drift mid-session |
| **Game exclusion** | User opens a game they listed | Proactive — "I know this game wrecks me" |

Marketing and onboarding should present **game exclusion first**, tilt sensitivity second — aligned with user feedback.

### 2.2 Tilt sensitivity (reactive)

Three profiles adjust **detection thresholds only** (not session cap duration):

| Profile | Who it's for | Fast clicks (critical) | Loss streak (critical) | Extension behavior |
|---------|--------------|------------------------|-------------------------|------------------|
| **Conservative** | Wants early nudges | ≥10 clicks / 5s | ≥4 losses in window | Warn at medium; Touch Grass at lower critical |
| **Moderate** (default) | Balanced | ≥14 clicks / 5s | ≥5 losses | Current-ish behavior |
| **Degen** | Wants room to run | ≥20 clicks / 5s | ≥7 losses | Only fires on obvious autopilot |

Settings copy shows a **plain-language card** per profile (not just dropdown labels).

**Demo mode** (existing): softens enforcement — warnings only, no Touch Grass lockout.

### 2.3 Game self-exclusion (proactive)

User maintains a list of **excluded games**. Each entry:

```typescript
type GameExclusionEntry = {
  id: string;              // uuid
  label: string;           // "Blackjack", user-facing
  matchPatterns: string[]; // lowercase substrings: url path, title, h1
  mode: 'block' | 'warn';
};
```

**Detection (extension content script):**

- On load + every 3s + on SPA URL change (`history` patch): build haystack = `location.href + document.title + main heading text (if found)`.
- Match if any `matchPattern` is contained in haystack (case-insensitive).
- First match wins.

**Enforcement modes**

| Mode | Behavior |
|------|----------|
| **block** | Immediate Touch Grass–style fullscreen overlay; message names game + "You excluded this game"; **timer = session cap minutes** (same vault `durationMinutes`) |
| **warn** | Extension sidebar expands: red banner + 10s countdown; if user stays on game, escalate to block (same timer) |

User can change mode per game in Settings.

### 2.4 Preset game library (MVP)

Ship curated presets users toggle on — avoids freeform regex for v1:

| Preset ID | Label | Match patterns (examples) |
|-----------|-------|---------------------------|
| `blackjack` | Blackjack | `blackjack`, `bj`, `21` |
| `roulette` | Roulette | `roulette`, `wheel` |
| `slots` | Slots | `slot`, `spin`, `reels` |
| `crash` | Crash / Limbo | `crash`, `limbo`, `aviator` |
| `live_dealer` | Live dealer | `live casino`, `live dealer`, `live blackjack` |
| `baccarat` | Baccarat | `baccarat`, `bacará` |
| `poker` | Poker | `poker`, `holdem`, `hold'em` |
| `sportsbook` | Sports / in-play | `sportsbook`, `/sports/`, `in-play` |

**Custom entry (day one):**

- **Keywords:** label + comma-separated match strings (same haystack rules as presets)
- **Paste link:** user pastes full game URL from casino; store normalized path segments as `matchPatterns` (e.g. `/casino/games/blackjack` from pasted URL)
- Max 20 total entries (presets + custom)

```typescript
type GameExclusionEntry = {
  id: string;
  label: string;
  matchPatterns: string[];
  mode: 'block' | 'warn';
  source: 'preset' | 'keywords' | 'url'; // audit only
};
```

---

## 3. Architecture

### 3.1 Data model

**Extend `user_settings`** (migration):

```sql
alter table user_settings
  add column if not exists game_exclusions jsonb not null default '[]'::jsonb,
  add column if not exists onboarding_completed_at timestamptz;
```

`game_exclusions` stores `GameExclusionEntry[]`.

**Why not vault rules?** Vault today is upsert-one-per-`ruleType` (`session_cap` only). Game list is multi-entry and belongs with preferences. Settings already syncs `riskProfile`; one `/user/settings` fetch for extension.

**Shared type** (`packages/shared`):

```typescript
export type GameExclusionMode = 'block' | 'warn';
export interface GameExclusionEntry {
  id: string;
  label: string;
  matchPatterns: string[];
  mode: GameExclusionMode;
}
export interface UserSettings {
  // existing fields...
  gameExclusions: GameExclusionEntry[];
  onboardingCompletedAt: string | null;
}
```

### 3.2 API

Extend existing routes only:

| Method | Path | Change |
|--------|------|--------|
| GET | `/user/settings` | Return `gameExclusions`, `onboardingCompletedAt` |
| PATCH | `/user/settings` | Accept `gameExclusions`, `riskProfile`, `onboardingCompletedAt` |

Validate:

- Max 20 exclusions
- Each `matchPatterns` length 1–10; pattern 2–120 chars for URL-derived paths
- URL paste: extract `pathname` + last path segment; reject off-origin if hostname not in allowlist (optional stretch)
- `mode` ∈ `block` | `warn`

### 3.3 Extension sync

**Background** (`background.ts`):

- On `sync-vault`, also `sync-settings` (or combined `sync-user-config`).
- Fetch `GET /user/settings` with Bearer token.
- Store in `chrome.storage.local`:
  - `tc_risk_profile`
  - `tc_game_exclusions`
  - `tc_demo`
  - `tc_notifications_enabled`

**Content script** (`content.ts`):

1. Load settings from storage on start + `onChanged`.
2. Pass `riskProfile` into `TiltDetector` constructor (refactor thresholds).
3. Run `GameExclusionWatcher` loop parallel to tilt detector.
4. Respect `tc_demo` — game exclusion shows banner only, no block.

**Sidebar** (`sidebar.ts`):

- Show current sensitivity label
- Link "Manage games" → `/settings#game-exclusion`
- If on excluded game: show status (warn countdown / blocked)

### 3.4 Web surfaces

| Surface | Content |
|---------|---------|
| **`/settings`** | Section 1: Tilt sensitivity (3 radio cards). Section 2: Game exclusion (presets + **custom keywords + paste link** + block/warn per game). Section 3: Notifications + demo mode. |
| **`/dashboard`** | First-login wizard: Welcome → Game exclusions → Sensitivity → Session cap → Done |
| **`/extension`** | Setup checklist: Install → Discord → **Game exclusions** → Sensitivity → Session cap |
| **Landing, `/touch-grass`, authed home** | Copy updated — game exclusion leads; see marketing pass (2026-05-28) |

Wizard sets `onboardingCompletedAt` on finish; skippable with "Set up later" (still shows banner on dashboard until complete).

---

## 4. UX copy — tilt sensitivity cards

**Conservative — early brakes**

> Fires warnings sooner. Touch Grass kicks in when click-speed or loss streaks look like autopilot, not just full send. Best if you want help before the hole gets deep.

**Moderate — balanced (default)**

> Standard thresholds. Ignores normal variance; reacts when pacing clearly shifts. Good default for most sessions.

**Degen — let me cook (until critical)**

> High tolerance. Only locks you out on obvious tilt patterns — rapid-fire clicks or a brutal loss run. You feel the warning late; enforcement is the last resort.

Each card shows example triggers: "Touch Grass when: 14+ clicks in 5 seconds" (numbers from profile table).

---

## 5. Testing plan

### 5.1 Unit tests (new)

| Package | Tests |
|---------|-------|
| `packages/shared` or `apps/extension` | `matchGameExclusion(haystack, entries)` — positive/negative cases |
| `apps/extension` | `TiltDetector` thresholds per `riskProfile` |
| `apps/api` | Settings PATCH validation (bad patterns, over limit) |

### 5.2 Manual staging gate (extends Phase 2)

1. Login → wizard appears → complete sensitivity + enable Blackjack block
2. Save settings → extension sync (reload extension)
3. Open test casino URL containing `blackjack` in path → **immediate block**
4. Change Blackjack to **warn** → reload → banner + 10s → block
5. Set sensitivity Conservative → verify tilt fires earlier on click spam
6. Demo mode on → warn only, no Touch Grass
7. Settings persist after logout/login

### 5.3 E2e (Playwright)

- Settings page: select sensitivity card, toggle preset game, save → API 200
- Optional: mock settings API for authed home command center link

Extension enforcement remains manual (Playwright cannot easily drive extension content scripts without fixture).

---

## 6. Implementation phases (post-approval)

| Phase | Scope | Est. |
|-------|--------|------|
| **A** | DB migration + shared types + API validation + unit tests | 1 session |
| **B** | Settings UI (cards + game exclusion) + PATCH wiring | 1 session |
| **C** | Extension: sync settings, TiltDetector profiles, GameExclusionWatcher, sidebar | 1–2 sessions |
| **D** | Dashboard onboarding wizard + `/extension` setup page | 1 session |
| **E** | Manual staging gate + e2e settings tests | 0.5 session |

**Order:** A → B → C → D → E (C depends on A; B and C can partially parallelize).

---

## 7. Resolved decisions (2026-05-28)

1. **Block timer:** reuse **session cap minutes** from vault for both block and warn escalation.
2. **Custom games:** **day one** — keyword list + paste game URL.
3. **Marketing:** **update all relevant pages** in same implementation wave (landing, extension, touch-grass, dashboard copy).

## 8. Related: live license check

Trust UI license badges — separate P3 spec: [2026-05-28-license-check-design.md](./2026-05-28-license-check-design.md).

---

## Spec self-review

- [x] Addresses tilt sensitivity clarity + extension wiring
- [x] Game exclusion with per-game block/warn (user choice)
- [x] Wizard + settings + extension sidebar (user choice)
- [x] Test plan defined
- [x] Scoped to extend existing settings/vault/sync patterns — no new microservices
