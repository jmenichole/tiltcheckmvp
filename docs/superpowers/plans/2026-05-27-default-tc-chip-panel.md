# Default TC Circle Chip (Not Pinned Sidebar) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every fresh session and new install shows the **TC circle chip** by default — not the expanded float panel and not the **Pin right** dock — unless the user explicitly opted into Pin or left the panel expanded themselves.

**Architecture:** Treat panel layout as three states: **chip** (default), **float** (expanded, draggable), **pinned** (`tc_panel_always_on`). Only user actions persist `tc_panel_expanded` / `tc_panel_always_on`. Auto-expand (game warn, tilt) is **session-only** and must not stick across tabs/reloads. Install hook seeds explicit false defaults.

**Tech Stack:** Chrome MV3 extension — `background.ts`, `sidebar.ts`, `content.ts`, `chrome.storage.local`.

**Related:** Pin-right dock shipped in v2.1.1; game warn auto-expand persists expanded today (bug vs product intent).

---

## Current behavior (why users see pinned/expanded)

| Source | Effect |
|--------|--------|
| Missing storage keys | `alwaysOn` false, `expanded` false → chip (OK for fresh) |
| `tc_panel_always_on: true` | Forces pinned dock + `html margin-right` on load |
| `tc_panel_expanded: true` | Float panel on load |
| Game warn handler | Sets `tc_panel_expanded: true` in storage → **sticky expanded** |
| Pin toggle | Sets `alwaysOn` + `expanded` true |

---

## Target behavior

| Scenario | UI |
|----------|-----|
| First install | TC chip, bottom-right |
| New casino tab / reload | TC chip (unless user pinned OR explicitly expanded last time **manually**) |
| Game block warn countdown | Expand panel **temporarily**; toast still primary; **do not** persist expanded |
| User clicks TC chip | Expand float panel; persist `tc_panel_expanded: true` |
| User clicks minimize (−) | Chip; persist `tc_panel_expanded: false` |
| User clicks Pin | Pinned dock; persist `alwaysOn: true`, `expanded: true` |
| User unpins | **Chip** (not float panel); persist `alwaysOn: false`, `expanded: false` |

---

## File map

| File | Change |
|------|--------|
| `apps/extension/src/background.ts` | Seed panel defaults on install |
| `apps/extension/src/sidebar.ts` | `loadInitialPanelState()` defaults; unpin → chip |
| `apps/extension/src/content.ts` | Session-only auto-expand; manual vs auto expand flags |

**New session flag (in-memory, not storage):**

```typescript
let userManuallyExpandedPanel = false; // true after chip click or pin; false on fresh tab init
```

Optional: `sessionStorage.setItem('tc_panel_session_expanded', '1')` for warn-only expand within tab without chrome.storage.

---

## Task 1: Install defaults

**Files:** `apps/extension/src/background.ts`

- [ ] **Step 1:** Extend `onInstalled`:

```typescript
chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.local.set({
    tc_demo: true,
    tc_panel_expanded: false,
    tc_panel_always_on: false,
  });
  // Optional one-time migration on update — see Task 5
});
```

- [ ] **Step 2:** Verify fresh profile: load stake.us → only TC chip visible.

---

## Task 2: Load state — chip unless explicit opt-in

**Files:** `apps/extension/src/sidebar.ts`

- [ ] **Step 1:** Clarify `loadInitialPanelState`:

```typescript
const alwaysOn = stored.tc_panel_always_on === true;
const userExpanded = stored.tc_panel_expanded === true;

return {
  alwaysOn,
  expanded: alwaysOn ? true : userExpanded,
  // ...
};
```

(Pinned still implies expanded; unpinned users only expand if they saved it.)

- [ ] **Step 2:** Document in comment: default missing keys → chip.

---

## Task 3: Session-only auto-expand (game warn)

**Files:** `apps/extension/src/content.ts`

- [ ] **Step 1:** Remove storage write from game warn auto-expand:

```typescript
// BEFORE (remove):
chrome.storage.local.set({ tc_panel_expanded: true });

// AFTER:
if (state.status === 'warn' && !panelExpanded && !userCollapsedPanel) {
  panelExpanded = true;
  sidebar?.update({ expanded: true });
  // no chrome.storage.local.set for expanded
}
```

- [ ] **Step 2:** On `state.status === 'clear'`, collapse if expand was auto-only:

```typescript
if (state.status === 'clear') {
  userCollapsedPanel = false;
  if (!panelAlwaysOn && !userManuallyExpandedPanel && panelExpanded) {
    panelExpanded = false;
    sidebar?.update({ expanded: false });
  }
}
```

- [ ] **Step 3:** Set `userManuallyExpandedPanel = true` in `onToggleExpand` when expanding; `false` when minimizing.

- [ ] **Step 4:** Init: `userManuallyExpandedPanel = initial.expanded && !initial.alwaysOn` OR derive from storage only on manual toggle (simpler: true if `tc_panel_expanded` on load without alwaysOn — treat stored expanded as manual preference).

**Refined rule:**

| Flag | Meaning |
|------|---------|
| `tc_panel_always_on` | User wants pinned dock every tab |
| `tc_panel_expanded` | User wants float panel open on new tabs |
| Neither | **Chip default** |

Auto warn: expand without touching either flag.

---

## Task 4: Unpin returns to chip

**Files:** `apps/extension/src/content.ts` — `onToggleAlwaysOn`

- [ ] When turning Pin **off**:

```typescript
if (!panelAlwaysOn) {
  panelExpanded = false;
  userManuallyExpandedPanel = false;
  chrome.storage.local.set({
    tc_panel_always_on: false,
    tc_panel_expanded: false,
  });
  sidebar?.update({ alwaysOn: false, expanded: false });
}
```

- [ ] When turning Pin **on**, keep current behavior (expand + dock).

- [ ] **Verify:** Pin → unpin → chip, page margin removed.

---

## Task 5: Optional one-time migration (update only)

**Files:** `apps/extension/src/background.ts`

Only if product wants **all** existing users reset from pinned → chip once:

```typescript
if (details.reason === 'update') {
  chrome.storage.local.get(['tc_panel_layout_migrated_v2_2'], (s) => {
    if (s.tc_panel_layout_migrated_v2_2) return;
    chrome.storage.local.set({
      tc_panel_always_on: false,
      tc_panel_expanded: false,
      tc_panel_layout_migrated_v2_2: true,
    });
  });
}
```

- [ ] **Decision:** Include migration **yes/no** before implement. Default recommendation: **yes** for `always_on` reset only if founder confirms; **no** migration for `expanded` (respect manual float preference).

**Founder default for this plan:** migrate `always_on → false` once on update; leave `expanded` as-is unless it was only set by game warn (cannot distinguish — accept one-time chip for everyone on update OR skip migration).

**Recommended:** Skip destructive migration; fix forward with Tasks 1–4 only.

---

## Task 6: Chip UX polish

**Files:** `apps/extension/src/sidebar.ts`

- [ ] Chip `title` tooltip: `TiltCheck — click to open`
- [ ] Ensure `DEFAULT_POSITION()` places chip bottom-right (already uses `CHIP_SIZE`)
- [ ] Pin button tooltip unchanged: `Pin right (shrink page)`

---

## Task 7: AutoVault + pinned dock

**Files:** `apps/extension/src/autovault/bootstrap.ts` (no change expected)

- [ ] Confirm AutoVault mount only when panel expanded — chip mode hides AV UI but engine runs; user expands to access. Document in manual test.

When chip default, user opens panel for AutoVault — acceptable.

---

## Task 8: Verify + ship

- [ ] **Manual matrix**

| Step | Expected |
|------|----------|
| Fresh install / cleared storage | TC chip only |
| Reload stake.us | Chip (no pin) |
| Click chip → expand | Float panel |
| Minimize | Chip; reload → chip if storage false |
| Pin | Pinned dock |
| Unpin | **Chip** (not float) |
| Game warn | Panel may open; reload → chip |
| Tilt toasts | Work with chip visible |

- [ ] `cd apps/extension && node build.js`
- [ ] Bump `manifest.json` patch (e.g. 2.1.5)
- [ ] Commit: `fix(extension): default panel to TC chip, not pinned sidebar`

---

## Spec coverage self-review

| Requirement | Task |
|-------------|------|
| Default chip | 1, 2 |
| Not pinned by default | 1, 4 |
| Game warn doesn't stick | 3 |
| Unpin → chip | 4 |
| User pin preference preserved | 2, 4 |

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-05-27-default-tc-chip-panel.md`.

**Inline execution recommended** — small, 3-file change set (~1 hour).

Say **go** to implement, or confirm Task 5 migration preference first.
