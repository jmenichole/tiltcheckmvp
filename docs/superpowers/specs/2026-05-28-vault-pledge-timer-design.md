# Vault Pledge Timer — Casino Lock (No Chain) (Design Spec)

**Date:** 2026-05-28  
**Status:** Approved  
**Decision:** Ship **Approach A** — casino vault + extension pledge timer (no Solana program in v1)  
**Related:** [2026-05-27-past-you-pact-design.md](./2026-05-27-past-you-pact-design.md), [2026-05-27-extension-autovault-scope.md](./2026-05-27-extension-autovault-scope.md), [phases.md](../../phases.md)

**Behavior grounding:** `tiltcheck-behavior-rg` — primary pattern **bankroll giveback** (post-win rinse). AutoVault skims %; pledge timer adds **user-set “don’t touch vault yet”** boundary. **Not cryptographically enforceable** — disclosed in UI.

---

## 1. Problem & goal

**Problem**

Degens cash a heater into casino vault, then withdraw back to play balance and rinse. AutoVault helps during play but does not stop **vault → wallet** moves after a session.

**Goal**

Let users **pledge** vaulted funds for a self-set duration. Extension blocks vault-withdraw UX on supported sites (Stake.us, nuts.gg) until `release_at`. Config lives in TiltCheck DB and syncs like other vault rules.

**Non-goals (v1)**

- Solana on-chain LockVault program
- Operator API self-exclusion
- Blocking mobile casino apps or other browsers
- Deposit limits or play-balance locks (vault withdraw path only)
- Bonuses page (removed from web IA in same initiative)

---

## 2. Honest product boundary (copy requirement)

Every pledge UI must state:

> *Pledge works in this browser with TiltCheck installed. You can still withdraw on mobile or another browser — this is a nudge from past-you, not a bank lock.*

Aligns with RG principle **user agency** + avoids false non-custodial claims.

---

## 3. User model: “Vault Pledge”

| Setting | Type | Options | Default |
|---------|------|---------|---------|
| Default pledge duration | minutes | 15 / 60 / 240 / 1440 (custom 15–10080) | 240 (4h) |
| Pledge enabled | boolean | on/off | off until first pledge |
| Note to future me | string | max 140 chars, optional | empty |
| Site scope | enum | `stake_us` \| `nuts` \| `both` | `both` |

**Actions**

1. **Start pledge** — user on Stake/nuts with extension + logged in; optional “move X to vault first” uses existing `depositToVault` / nuts deposit bridge.
2. **Active pledge** — `release_at` in future; extension blocks vault withdraw interactions + shows countdown overlay on attempt.
3. **Release** — timer expires; pledge marked complete; withdraw UI unblocked in extension context.

**Mental model (degen copy):** *“Bag’s in vault — past you said don’t pull it until {time}.”*

---

## 4. Architecture

### 4.1 Data model

New vault rule type: **`vault_pledge`**

```ts
type VaultPledgeConfig = {
  releaseAt: string;        // ISO 8601 UTC
  durationMinutes: number;  // audit / display
  site: 'stake_us' | 'nuts' | 'both';
  futureMeNote?: string;    // max 140
  status: 'active' | 'released' | 'cancelled';
  startedAt: string;
};
```

- Stored in existing `vault_rules` table (`rule_type`, `config` jsonb).
- API: extend `validateRulePayload` to accept `vault_pledge` alongside `session_cap`.
- One **active** pledge per user per site (POST upserts same `rule_type` pattern as session cap).

**Profile settings** (`user_settings` — optional v1.1):

| Field | Purpose |
|-------|---------|
| `defaultPledgeMinutes` | Pre-fill dashboard pledge form |
| `pledgeFutureMeNote` | Default note |

v1 can store defaults only in `vault_pledge` config on create; settings page section mirrors My Line pattern.

### 4.2 Sync path

Same as session cap:

```
Web dashboard / Settings → POST/PATCH /vault → extension Sync → tc_vault_rules
```

Extension reads active `vault_pledge` where `status === 'active'` and `releaseAt > now`.

### 4.3 Extension enforcement

| Layer | Behavior |
|-------|----------|
| **Pledge watcher** (new module) | Poll synced rules; if active pledge on current site, set `pledgeActive` flag |
| **Withdraw guard** | `MutationObserver` + capture-phase listeners on vault withdraw controls (Stake/nuts DOM selectors — maintain per site) |
| **Block UX** | Full-screen opaque overlay (reuse friction/tilt overlay patterns): countdown, note, “Past you pledged until {time}”; **auto-open** `/touch-grass?reason=pledge&until=…` in a new tab (same as tilt/game lockouts) |
| **AutoVault** | Unchanged; composable — skim during play, pledge locks withdraw after |

**Not in v1:** programmatic prevent of GraphQL withdraw (no request interception); DOM + UX block only.

### 4.4 Web surfaces

| Surface | Change |
|---------|--------|
| **Dashboard** | New card “Vault Pledge” — duration, site, note, Start / Active countdown / Cancel (cancel = status `cancelled`, extension unblocks) |
| **Settings** | Section “Vault pledge defaults” — default duration, note; link to dashboard to arm |
| **Extension popup** | Line under My Line: “Pledge: 2h 14m left” or “No vault pledge” |
| **Stake/nuts setup pages** | One line cross-link to pledge |

### 4.5 Bonuses removal (same initiative)

| Item | Action |
|------|--------|
| `NAV_QUICK_LINKS` | Remove Bonuses |
| `LandingAuthedHome` | Remove Bonuses link |
| `touch-grass` hub | Redesigned break page; context via `?reason=tilt\|pledge\|game`; bonuses side quest removed |
| `/bonuses` | `redirect('/dashboard')` or `redirect('/')` |
| API `GET /bonuses` | Keep (dormant); no web links |
| `BonusGrid.tsx`, `bonuses/page.tsx` | Keep files or delete — prefer redirect + dead code removal in implementation plan |

---

## 5. API changes

### `POST /vault` / `PATCH /vault/:id`

- Accept `ruleType: 'vault_pledge'`.
- Validate `releaseAt` is future ISO string; `durationMinutes` 15–10080; `site` enum; `status` transitions.
- Reject second active pledge if one exists (or upsert single `vault_pledge` row per user).

### `GET /vault`

- Return `vault_pledge` rules with other rules; extension filters enabled + active.

---

## 6. Escalation & interaction with other tools

| Tool | Interaction |
|------|-------------|
| **Session cap / Touch Grass** | Independent — tilt lockout does not cancel pledge |
| **Game exclusion** | Independent |
| **AutoVault** | Encouraged before pledge (“skim first, then pledge what’s left in vault”) |
| **Demo mode** | Pledge arming requires logged in + demo off (same gate as enforcement) |

---

## 7. Error handling

| Case | UX |
|------|-----|
| Pledge expired server-side but extension stale | Sync on popup open + content load; auto-mark `released` on GET if `releaseAt <= now` |
| User on wrong site | Pledge UI shows “Open Stake/nuts to enforce” |
| Withdraw selector miss (site DOM change) | Log + popup warning “Pledge active but guard may be outdated — sync and update extension” |
| No vault funds | Allow pledge anyway (timer + honor); optional warn “Nothing in vault yet” |

---

## 8. Testing

| Layer | Tests |
|-------|-------|
| **Shared** | `normalizeVaultPledgeConfig()` unit tests |
| **API** | POST/PATCH validation for `vault_pledge` |
| **Web** | Playwright: arm pledge on dashboard, settings defaults save |
| **Extension** | Manual staging on Stake.us: start pledge → withdraw button shows overlay → after expiry or cancel, unblock |

---

## 9. Voice & RG

- **Ally:** “Past you pledged this vault bag” — not “withdrawal denied by TiltCheck.”
- **Autopilot/giveback:** “Stop the rinse — vault stays put until {time}.”
- No clinical RG, no emojis.
- Disclose bypass limits (§2) on first pledge and settings.

---

## 10. Phase & scope guard

- Fits **Phase 2+** harm reduction; does not require Solana deploy.
- Defer on-chain LockVault to future spec if bypass rate proves too high.
- Bonuses tab remains Phase 3; **public page removed now** per founder request.

---

## 11. Open questions (implementation plan)

1. **Cancel pledge** — **Decision:** allow early cancel with checkbox + “Break my pledge” button (agency over punishment). No silent cancel.
2. **Auto-start pledge after AutoVault skim** — v1 manual only; v1.1 optional hook from stake-engine on big win.
3. **nuts vault withdraw selectors** — confirm DOM targets in implementation plan task 0.

---

## 12. Success criteria

- [ ] User arms 4h pledge on dashboard; Sync; on Stake tab, vault withdraw attempt shows full-screen countdown block
- [ ] After `release_at`, withdraw works in same browser without overlay
- [ ] Settings show default pledge duration; dashboard shows active pledge state
- [ ] Bonuses removed from nav and `/bonuses` redirects
- [ ] Copy includes bypass disclosure
