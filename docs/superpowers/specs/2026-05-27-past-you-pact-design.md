# Past You Pact — Ally-Not-Enemy Touch Grass (Design Spec)

**Date:** 2026-05-27  
**Status:** Approved  
**Trigger:** Founder/gambler feedback — Touch Grass feels punitive enough to uninstall; users who feel judged hide wins from accountability  
**Related:** [2026-06-07-phase-2-protected-session-design.md](./2026-06-07-phase-2-protected-session-design.md), [2026-05-28-tilt-sensitivity-game-exclusion-design.md](./2026-05-28-tilt-sensitivity-game-exclusion-design.md), [phases.md](../../phases.md)

**Evidence:** Petry CBT / self-imposed boundaries (Dixon & Johnson, 2012); habit/autopilot framing (Ferrari et al., 2022) — see `tiltcheck-behavior-rg` skill `references/evidence-base.md`.

---

## 1. Problem & goal

**Problem**

| Pain | Today |
|------|--------|
| Touch Grass feels like punishment | Fullscreen, undismissable, no override — degens experience external “no” |
| Product feels like it judges | Reason card can read as moral verdict even with degen copy |
| Social/accountability backfire | Users hide wins to avoid shame when losses follow |
| Intent vs feel | Protection works; retention risk when lockout triggers uninstall |

**Goal**

Make critical enforcement feel like **executing the user’s own pact** (“past you set this line”), not TiltCheck imposing RG.

**Non-goals**

- Operator/account-level self-exclusion
- Public shame, buddy auto-alerts, loss totals on lockout
- Removing hard stop entirely (protected sessions metric still requires real enforcement)
- Clinical/pathological gambling language in UI

---

## 2. Design principles

1. **Self-set, not imposed** — Overlay and warnings reference saved vault/settings (“Your 10 min line”).
2. **Autopilot, not morality** — Triggers are factual (“14 clicks in 5s”, game name on no-play list).
3. **Private by default** — No money shame, no social broadcast on lockout.
4. **Brief before hard** — Pulse → last call unchanged; friction-first adds a step before fullscreen when user chose it.
5. **Snooze is opt-in** — Off by default; max one per session when enabled, then guaranteed lockout.

---

## 3. User model: “My Line”

Single mental model on dashboard + onboarding (extend existing session cap flow):

| Setting | Type | Options | Default |
|---------|------|---------|---------|
| Session cap | minutes | 1–60 | 10 |
| When critical hits | `lockoutStyle` | `hard_stop` \| `friction_first` | `friction_first` |
| Allow 1 snooze / session | `snoozeEnabled` | boolean | `false` |
| Note to future me | `futureMeNote` | string, max 140 chars, optional | empty |

**Copy anchor:** *“When autopilot hits, past you wanted a break — not a lecture.”*

Sync path unchanged: web/dashboard → API vault or user settings → extension **Sync**.

---

## 4. Escalation ladder (revised)

### 4.1 All users (unchanged pre-critical)

```
clear → pulse check (medium+) → last call (high+)
```

### 4.2 At critical (by `lockoutStyle`)

| Style | First critical in session | Second critical in same session |
|-------|---------------------------|----------------------------------|
| `hard_stop` | Touch Grass full cap | Touch Grass (already locked if still active) |
| `friction_first` | **Friction screen** (see §5.2) | Touch Grass full cap |

Game block / warn paths unchanged; game block still uses same timer = session cap minutes.

### 4.3 Snooze (when `snoozeEnabled`)

- Consumed at most **once per browser session** (tab session or `sessionStorage` flag — implementation detail in plan).
- If snooze used during friction screen → return to play; next critical → Touch Grass (no second friction, no second snooze).
- Snooze button copy: *“Past you allowed one pass — this is it.”*

---

## 5. UX specifications

### 5.1 Touch Grass overlay (redesign)

**Visual hierarchy (top → bottom):**

1. **User note** (`futureMeNote`) — prominent if set; otherwise skip block
2. **Pact line** — `Your line: {N} min · you set this in Settings`
3. **Factual trigger** — small neutral card (existing reason string, no moralizing)
4. **Timer** — unchanged mechanics
5. **Footer** — link to `/touch-grass` (break ideas); no share, no loss/win amounts

**Remove:** “Why you are here” as accusatory header; replace with `What triggered this` or omit header.

**Tagline:** Keep “Made for degens” — subordinate to pact line.

### 5.2 Friction screen (first critical, `friction_first` only)

Full-viewport or heavy dim (lighter than Touch Grass):

- Same pact line + user note + factual trigger
- **15s** countdown before bet buttons re-enable (reuse `blockBettingUI` pattern)
- If `snoozeEnabled`: one button **Use my one snooze** (consumes snooze, dismisses friction)
- If snooze off: no continue until countdown completes; then play resumes with sidebar warning state elevated
- No fullscreen undismissable timer yet

### 5.3 Warnings (pulse / last call)

Add optional pact reminder subline on last call: *“Your {N} min line is armed.”*

Do not add preachy RG language.

### 5.5 Tilt pattern education (required)

**Every tilt surface must tell the user what pattern fired and the numbers behind it** — ally-aligned habit education, not a vague “you’re tilting.”

**Principle:** Name the pattern → show the metric → one-line habit insight (ally voice). Same explanation flows pulse → last call → friction → Touch Grass → sidebar.

**Pattern catalog (MVP):**

| `type` | Pattern label (UI) | Metric shown | Habit insight (subline) |
|--------|-------------------|--------------|-------------------------|
| `fast_clicks` | Autopilot clicks | `{N} clicks in 5s` | Pace picked up — that’s tilt speed, not “bad luck.” |
| `chasing_losses` | Loss-chase | `{N} losses tracked` | Chasing pattern — next bet often faster after red. |

When both patterns active, show **highest severity** pattern as primary; optional second line if space (sidebar only).

**Copy structure per surface:**

```
Headline:  [pattern label] — [short ally hook]
Detail:    [metric] · [profile] sensitivity
Insight:   [one habit line from table]
```

**Examples:**

| Stage | Headline | Detail | Insight |
|-------|----------|--------|---------|
| Pulse | Autopilot clicks — heating up | 12 clicks in 5s · moderate line | Pace picked up — walk one lap before the next spin. |
| Last call | Autopilot clicks — last call | 14 clicks in 5s · moderate line | Your 10 min line is armed. Next spike locks the tab. |
| Touch Grass | (in trigger card) | Pattern: autopilot clicks · 16 clicks in 5s | Habit note: click speed spikes when you’re on autopilot, not thinking. |

**Implementation notes:**

- Extend `TiltIndicator` (or companion `formatTiltEducation()`) with `patternLabel`, `metricLine`, `insightLine` built from live detector state — not static strings only.
- Pass full education bundle to `showTiltWarningBanner`, friction, Touch Grass, and sidebar `alertLine()`.
- Game blocks use parallel structure: `Pattern: game block · {label} on your no-play list` (not tilt, same trigger card UX).
- Demo mode: show same pattern education; subline notes demo won’t lock.

**Non-goals:** Dollar amounts, win/loss totals, clinical labels, shame.

---

### 5.4 Ally voice copy guide

Humor, dry wit, and millennial slang are **on-brand** when they keep TiltCheck feeling like a sharp friend, not RG software in a degen mask. Aligns with README voice pillars and ally-not-enemy goal.

**Rule: facts first, flavor second.** Trigger = behavioral truth; pact = agency; one optional wit line max.

| Layer | Tone | Do | Don't |
|-------|------|-----|-------|
| Trigger | Factual + **educational** | “Pattern: autopilot clicks · 14 clicks in 5s” + habit insight | Vague “you’re tilting”, moralizing |
| Pact | Agency + casual | “Your 10 min line · you set this in Settings” | “We locked you out for your own good” |
| User note | Their words | Render verbatim, no editorialize | Add snark on top of their note |
| Wit line | Dry, true | “Tab locked before the hole got deeper” | “Cooked again”, “skill issue”, roasts |
| Slang | Natural, sparse | no cap, autopilot, locked in, touch grass | Stacked slang (“no cap lowkey big yikes”) |

**Approved patterns (examples — adapt, don't copy-paste every surface):**

| Surface | Copy |
|---------|------|
| My Line helper | When autopilot hits, past you wanted a break — not a lecture. |
| Pulse check | Autopilot clicks — heating up | + detail line with click count |
| Last call | Autopilot clicks — last call | + metric + armed line |
| Friction headline | Pause — your line is armed. |
| Snooze button | Past you allowed one pass — this is it. |
| Touch Grass sub | Tab locked before the hole got deeper. |
| Trigger card header | What triggered this |
| Demo last call | Demo mode — no lockout. Still, walk it off. |
| Sidebar (heating) | `{N} clk · autopilot clicks` | Live metric in panel |

**Banned patterns:**

- Clinical RG: self-exclusion, responsible gaming intervention, play responsibly
- Shame / money: dollar amounts, “you lost”, “giving it back”, win/loss scorekeeping on overlay
- Parent tone: because we said so, you need to stop, we're disappointed
- Cruel humor: insults, “degen brain”, mockery during lockout
- Emojis in source/UI strings (README rule)

**Implementation:** All new Past You Pact strings in extension + dashboard must pass this table before ship. User-authored `futureMeNote` is never rewritten.

---

## 6. Privacy & accountability rules

| Rule | Rationale |
|------|-----------|
| Never show dollar loss/win on lockout | Avoid shame; users hide wins when judged |
| AutoVault stats stay in TC panel only | Bankroll hygiene without scorekeeping |
| No auto Discord/buddy messages on enforcement | Phase 3+ social must be opt-in |
| Copy avoids “accountability partner” unless user opts in | Founder observation: judgment → secrecy |

---

## 7. Data model (Phase 3 fields)

Extend vault `session_cap` config or `user_settings` (prefer vault rule config for co-location with cap):

```typescript
type SessionCapConfig = {
  durationMinutes: number;
  lockoutStyle?: 'hard_stop' | 'friction_first'; // default friction_first
  snoozeEnabled?: boolean; // default false
  futureMeNote?: string; // max 140
};
```

Extension storage: mirror in synced vault rules; local fallbacks for demo.

---

## 8. Phase split

| Phase | Scope | Success |
|-------|-------|---------|
| **2.5** | Overlay copy redesign + pact line + `futureMeNote` display (note from settings if field exists; web input can ship with 2.5) | Staging: user recognizes own cap on lockout |
| **3a** | API + dashboard fields for `lockoutStyle`, `snoozeEnabled`, `futureMeNote` | Save → sync → extension reads |
| **3b** | Friction screen + snooze logic | First critical friction; second critical Touch Grass; one snooze works |
| **Defer** | Per-trigger styles, analytics on snooze abuse, buddy integration | Out of scope |

**2.5 can ship without new API fields** if `futureMeNote` is stored in `user_settings` first with minimal PATCH.

---

## 9. Testing

| Case | Expected |
|------|----------|
| Hard stop + critical tilt | Touch Grass; pact line visible; note if set |
| Friction first + 1st critical | Friction 15s; no Touch Grass |
| Friction first + 2nd critical same session | Touch Grass |
| Snooze on + friction | Snooze dismisses; next critical → Touch Grass |
| Snooze off + friction | Wait 15s only |
| Game block | Same overlay pact framing |
| Demo mode | No lockout; friction/overlay preview optional banner only |
| Private note empty | Pact line + trigger only |
| Tilt pulse | Pattern label + click/loss metric + insight visible |
| Tilt lockout | Trigger card shows pattern + metric + habit line |

Manual sign-off on stake.us test tab; add Playwright only if stable selectors exist.

---

## 10. Open questions

1. **Session boundary for snooze reset** — calendar day vs tab close vs 24h? Recommend: reset on tab close / new browser session.
2. **Default `lockoutStyle`** — spec default `friction_first`; confirm for degen ICP.
3. **Note field on mobile web** — dashboard only for MVP.

---

## 11. Success metrics

- Qualitative: founders/testers report lockout feels self-chosen, not parental
- Retention: fewer extension uninstalls post-first-enforcement (when measurable)
- Protected sessions: metric unchanged — enforcement must still fire for armed users
- No increase in demo-mode stickiness used to avoid arming cap
