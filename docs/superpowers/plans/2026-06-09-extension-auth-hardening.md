# Extension Auth Hardening + Touch Grass Ship Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Note:** `/write-plan` is deprecated; this plan was written from Tilt Shield Scan, Code Review, and Security Review findings (2026-06-09).

**Goal:** Ship Discord login persistence (web ↔ extension) and Touch Grass hub cards without the token-trust vulnerabilities flagged in review. Block commit until P1 auth fixes pass re-scan.

**Architecture:** Keep the existing JWT + `tc_session` cookie model. Extension stores `tc_session_token` in `chrome.storage.local`. OAuth ext flow delivers tokens only on the API callback origin (same-window). Web login sync uses `/api/auth/extension-handoff` on TiltCheck web hosts plus optional side-panel sync trigger. Remove wildcard `postMessage` and unvalidated same-window auth on `<all_urls>`.

**Tech Stack:** Hono API (`apps/api`), Chrome MV3 extension, Next.js App Router (`apps/web`), Playwright e2e (optional smoke).

**Build order:** Task 1 (P1 security) → Task 2 (P1 sync UX) → Task 3 (P2 hardening) → Task 4 (commit + verify). Do not merge Task 4 before Task 1.

**Source reviews:** Tilt Shield BLOCK, Code Review REQUEST CHANGES, Security Review 2 High + 1 Medium.

---

## File map

| File | Responsibility |
|------|----------------|
| `apps/api/src/routes/auth.ts` | OAuth ext callback HTML — remove wildcard opener broadcast |
| `apps/extension/src/extension-auth.ts` | Auth listener, web handoff sync, `saveDiscordAuth()` |
| `apps/extension/src/content.ts` | Content-script auth listener (strict mode only) |
| `apps/extension/src/panel.ts` | Side panel — optional opener listener + panel sync on open |
| `apps/extension/src/popup.ts` | Popup — optional opener listener (if still used) |
| `apps/web/src/app/api/auth/extension-handoff/route.ts` | Web cookie → JWT JSON for extension sync |
| `apps/web/src/components/TouchGrassHub.tsx` | Break activity cards (already edited, ship with auth fix) |

---

## Task 1: Fix P1 token-trust bugs (BLOCK ship until done)

### Task 1A: Remove wildcard OAuth opener broadcast

**Files:**
- Modify: `apps/api/src/routes/auth.ts`

- [ ] **Step 1:** In `source=ext` callback HTML, **remove** `window.opener.postMessage(payload, '*')` entirely.
- [ ] **Step 2:** Keep only same-window delivery on the API origin:

```javascript
window.postMessage(payload, window.location.origin);
```

- [ ] **Step 3:** Keep `setTimeout(() => window.close(), 500)` so the popup closes after content script captures the token.

**Why:** Any page that opens ext OAuth as a popup can steal the JWT when opener gets `postMessage('*')`.

---

### Task 1B: Strict auth listener in content script

**Files:**
- Modify: `apps/extension/src/extension-auth.ts`
- Modify: `apps/extension/src/content.ts`

- [ ] **Step 1:** Change `registerDiscordAuthListener()` to accept options:

```typescript
export function registerDiscordAuthListener(options?: {
  /** Allow postMessage from API origin (OAuth popup → opener tab). Off in content script. */
  allowOpenerFromApi?: boolean;
}): void
```

- [ ] **Step 2:** **Remove** the unvalidated `fromCallbackPage = event.source === window` bypass for content script.
- [ ] **Step 3:** Accept auth messages only when **both**:
  - `trustedApiOrigin(event.origin)` is true, and
  - `event.source === window` (same-window on API callback page)

- [ ] **Step 4:** For panel/popup only, optionally allow `allowOpenerFromApi: true` **and** `trustedApiOrigin(event.origin)` (never accept same-window from non-API origins).

- [ ] **Step 5:** In `content.ts`, call `registerDiscordAuthListener()` with **no options** (strict API-origin + same-window only).

- [ ] **Step 6:** In `panel.ts` / `popup.ts`, call `registerDiscordAuthListener({ allowOpenerFromApi: true })` if opener path is still needed; prefer relying on callback-page content script only.

**Why:** Any website can `postMessage({ type: 'discord-auth-success', token })` to itself; content script on `<all_urls>` currently stores it.

---

### Task 1C: Verify OAuth ext flow end-to-end

- [ ] **Step 1:** `cd apps/extension && node build.js`
- [ ] **Step 2:** Reload extension in Chrome.
- [ ] **Step 3:** Side panel → **Connect Discord** → complete OAuth → confirm panel shows logged-in state and vault sync runs.
- [ ] **Step 4:** Confirm token is **not** logged to console or left in popup URL.

---

## Task 2: Fix P1 web login sync gap

### Task 2A: Side-panel web session sync

**Files:**
- Modify: `apps/extension/src/extension-auth.ts`
- Modify: `apps/extension/src/panel.ts`

- [ ] **Step 1:** Add `syncAuthFromWebSessionViaTab()` or reuse handoff by opening/fetching from a TiltCheck web tab context.

**Option A (recommended):** On panel load, if not logged in, call background message `sync-web-auth` that:
1. Queries tabs matching `webBaseUrl()` hostname
2. If a TiltCheck tab exists, `chrome.scripting.executeScript` to run handoff fetch in page context **or** message content script on that tab to run `syncAuthFromWebSession()`

**Option B (simpler):** Document that users must visit `tiltcheck.me` once after web login (panel copy only — not sufficient alone).

- [ ] **Step 2:** Implement Option A minimum: panel startup calls `syncAuthFromWebSession()` when `webBaseUrl()` tab is active, else show hint: “Open tiltcheck.me once to sync login.”

- [ ] **Step 3:** After web login redirect to dashboard, content script on web should auto-sync (existing `syncAuthFromWebSession()` in `content.ts`).

---

### Task 2B: Web handoff route smoke test

**Files:**
- `apps/web/src/app/api/auth/extension-handoff/route.ts` (no change required for P1)

- [ ] **Step 1:** Log in on web → visit `/dashboard` with extension installed → confirm extension panel shows connected without manual Connect Discord.

---

## Task 3: P2 hardening (nice before ship, required before public CWS update)

### Task 3A: `trustedApiOrigin` uses runtime API URL

**Files:**
- Modify: `apps/extension/src/extension-auth.ts`

- [ ] Use `resolveApiBaseUrl()` (async) inside the message listener instead of baked `apiBaseUrl()` so staging/dev overrides match OAuth callback origin.

---

### Task 3B: Clear extension session when web handoff returns 401

**Files:**
- Modify: `apps/extension/src/extension-auth.ts`

- [ ] When `syncAuthFromWebSession()` gets 401 on a TiltCheck web host, call `clearExtensionSession()` (or send `tc-logout` to background) so stale tokens don't linger after web logout.

---

### Task 3C: Localhost dev sync

**Files:**
- Modify: `apps/extension/src/content.ts`

- [ ] **Decision:** Either remove `localhost:3000` from the content-script `excluded` list for auth listeners only, or register auth sync outside the `if (!excluded)` block so local web dev can test handoff.

---

### Task 3D: Extension handoff XSS amplification (document / defer)

**Files:**
- `apps/web/src/app/api/auth/extension-handoff/route.ts`

- [ ] **Document** in code comment: endpoint materializes httpOnly cookie as bearer JWT — XSS on web is severity escalation.
- [ ] **Future (optional):** One-time exchange code bound to extension ID, or `chrome.cookies` read with `cookies` permission instead of JSON handoff.

---

## Task 4: Ship Touch Grass cards + auth fix

### Task 4A: Stage and commit

**Files to include:**
- `apps/api/src/routes/auth.ts`
- `apps/extension/src/extension-auth.ts` (new)
- `apps/extension/src/content.ts`
- `apps/extension/src/panel.ts`
- `apps/extension/src/popup.ts`
- `apps/extension/src/manifest.json` (v2.4.4+)
- `apps/web/src/app/api/auth/extension-handoff/route.ts` (new)
- `apps/web/src/components/TouchGrassHub.tsx`

**Do not commit:** `apps/web/.playwright-browsers/`, `test-results/`, `tsconfig.tsbuildinfo`

- [ ] Run `pnpm build` and `cd apps/extension && node build.js`
- [ ] Re-run Tilt Shield manual check (or add `scripts/scan_staged_security.py` to repo)
- [ ] Commit message: `fix(extension): harden Discord auth bridge and sync web session`

---

### Task 4B: Push and verify CI

- [ ] Push to `main`
- [ ] Confirm GitHub **build** job passes
- [ ] Run `supabase/repair-migration-history.sql` on Supabase if **Supabase Preview** still fails (separate from auth work)

---

## Verification checklist

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Connect Discord from side panel | Logged in, vault/settings sync |
| 2 | Log in on web → visit dashboard | Extension auto-syncs without reconnect |
| 3 | Log out on web (Settings or nav) | Extension disconnects |
| 4 | Malicious page `postMessage` fake auth | Extension **ignores** (after Task 1B) |
| 5 | Attacker opens ext OAuth popup | No token to opener (after Task 1A) |
| 6 | Touch Grass `/touch-grass` | Cards 01–12 render, external links open in new tab |

---

## Out of scope (this plan)

- Supabase migration history repair (see `supabase/repair-migration-history.sql`)
- Replacing JWT handoff with `chrome.cookies` (future hardening)
- CWS publish of extension v2.4.4

---

## Recommendation summary

**Do not commit** current uncommitted auth changes until Task 1 is complete. The Touch Grass hub edits are safe to ship in the same commit once auth is hardened.
