# Vault Pledge Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship casino vault pledge timer (no chain) — users arm a timed vault-withdraw block on Stake/nuts via extension DOM guard, configured on dashboard/settings and synced through existing vault API; remove public bonuses page from IA.

**Architecture:** Add `vault_pledge` vault rule type with shared `normalizeVaultPledgeConfig()`; extend Hono `/vault` validation (upsert one row per user like `session_cap`); extension `vault-pledge-guard.ts` reads synced rules, blocks withdraw UI with full-screen overlay; web dashboard card to arm/cancel; settings defaults pre-fill form; bonuses nav/page removed.

**Tech Stack:** TypeScript monorepo (pnpm), `@tiltcheck/shared`, Hono API, Supabase `vault_rules`, Chrome MV3 extension (esbuild), Next.js App Router, node:test, Playwright e2e.

**Spec:** [2026-05-28-vault-pledge-timer-design.md](../specs/2026-05-28-vault-pledge-timer-design.md)

**Build order:** Bonuses removal → shared + API → web UI → extension guard → popup + manual QA.

---

## File map

| File | Responsibility |
|------|----------------|
| `packages/shared/src/vault-pledge.ts` | `VaultPledgeConfig`, `normalizeVaultPledgeConfig()`, `isPledgeActive()`, `buildPledgeReleaseAt()` |
| `packages/shared/src/vault-pledge.test.ts` | Unit tests |
| `packages/shared/src/index.ts` | Re-export |
| `packages/shared/package.json` | Ensure test script includes new test file |
| `apps/api/src/routes/vault.ts` | Accept `vault_pledge` rule type; auto-release expired on GET |
| `apps/web/src/app/bonuses/page.tsx` | Replace with redirect |
| `apps/web/src/lib/nav-menu.ts` | Remove Bonuses link |
| `apps/web/src/components/LandingAuthedHome.tsx` | Remove Bonuses link |
| `apps/web/src/app/touch-grass/page.tsx` | Remove bonuses side quest |
| `apps/web/src/app/(app)/dashboard/page.tsx` | Vault Pledge card |
| `apps/web/src/app/(app)/settings/page.tsx` | Pledge defaults section |
| `apps/extension/src/vault-sync.ts` | `getVaultPledgeConfig()`, typed snapshot |
| `apps/extension/src/vault-pledge-guard.ts` | Site match, withdraw intercept, overlay |
| `apps/extension/src/vault-pledge-overlay.ts` | Full-screen countdown UI |
| `apps/extension/src/content.ts` | Start pledge guard after vault sync |
| `apps/extension/src/popup.ts` | Pledge status line |
| `apps/extension/src/manifest.json` | Version bump (e.g. 2.3.0) |

**Withdraw guard selectors (v1 — update after DOM recon):**

```typescript
// apps/extension/src/vault-pledge-guard.ts
export const VAULT_WITHDRAW_SELECTORS = {
  stake_us: [
    'button[data-testid="vault-withdraw"]',
    'button[aria-label*="Withdraw" i]',
    '[class*="vault"] button:has-text("Withdraw")', // fallback via text scan in code
  ],
  nuts: [
    'button[aria-label*="withdraw" i]',
    '[data-test*="vault"] button',
  ],
} as const;
```

Implementation uses `querySelectorAll` + text match (`/withdraw/i`) on vault panel roots when data-testid missing.

---

## Task 1: Remove bonuses from web IA

**Files:**
- Modify: `apps/web/src/lib/nav-menu.ts`
- Modify: `apps/web/src/components/LandingAuthedHome.tsx`
- Modify: `apps/web/src/app/touch-grass/page.tsx`
- Modify: `apps/web/src/app/bonuses/page.tsx`

- [ ] **Step 1: Remove nav and landing links**

In `nav-menu.ts`, delete the Bonuses entry from `NAV_QUICK_LINKS`:

```typescript
export const NAV_QUICK_LINKS: NavLink[] = [
  { href: '/casinos', label: 'Casino Trust' },
  { href: '/dashboard', label: 'Dashboard' },
];
```

Remove `<Link href="/bonuses">Bonuses</Link>` from `LandingAuthedHome.tsx`.

Touch Grass hub lives in `TouchGrassHub.tsx` (no bonuses card). Task 1 only needs nav/landing/bonuses redirect if not already done.

- [ ] **Step 2: Redirect `/bonuses`**

Replace `apps/web/src/app/bonuses/page.tsx` with:

```typescript
import { redirect } from 'next/navigation';

export default function BonusesPage() {
  redirect('/dashboard');
}
```

- [ ] **Step 3: Verify**

Run: `cd apps/web && npx tsc --noEmit`  
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/nav-menu.ts apps/web/src/components/LandingAuthedHome.tsx apps/web/src/app/touch-grass/page.tsx apps/web/src/app/bonuses/page.tsx
git commit -m "chore(web): remove bonuses page from IA"
```

---

## Task 2: Shared vault pledge config

**Files:**
- Create: `packages/shared/src/vault-pledge.ts`
- Create: `packages/shared/src/vault-pledge.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add module**

```typescript
// packages/shared/src/vault-pledge.ts
export type VaultPledgeSite = 'stake_us' | 'nuts' | 'both';
export type VaultPledgeStatus = 'active' | 'released' | 'cancelled';

export type VaultPledgeConfig = {
  releaseAt: string;
  durationMinutes: number;
  site: VaultPledgeSite;
  futureMeNote: string;
  status: VaultPledgeStatus;
  startedAt: string;
};

const MIN_MINUTES = 15;
const MAX_MINUTES = 10_080;

export function buildPledgeReleaseAt(durationMinutes: number, from = new Date()): string {
  const ms = durationMinutes * 60_000;
  return new Date(from.getTime() + ms).toISOString();
}

export function normalizeVaultPledgeConfig(
  raw: Record<string, unknown> = {},
  opts?: { now?: Date },
): VaultPledgeConfig {
  const now = opts?.now ?? new Date();
  const durationRaw = typeof raw.durationMinutes === 'number' ? raw.durationMinutes : 240;
  const durationMinutes = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.trunc(durationRaw)));

  const site =
    raw.site === 'stake_us' || raw.site === 'nuts' || raw.site === 'both' ? raw.site : 'both';

  let futureMeNote = typeof raw.futureMeNote === 'string' ? raw.futureMeNote.trim() : '';
  if (futureMeNote.length > 140) futureMeNote = futureMeNote.slice(0, 140);

  const status =
    raw.status === 'released' || raw.status === 'cancelled' || raw.status === 'active'
      ? raw.status
      : 'active';

  const startedAt =
    typeof raw.startedAt === 'string' && raw.startedAt.length > 0
      ? raw.startedAt
      : now.toISOString();

  let releaseAt = typeof raw.releaseAt === 'string' ? raw.releaseAt : buildPledgeReleaseAt(durationMinutes, now);
  if (Number.isNaN(Date.parse(releaseAt))) {
    releaseAt = buildPledgeReleaseAt(durationMinutes, now);
  }

  return { releaseAt, durationMinutes, site, futureMeNote, status, startedAt };
}

export function isPledgeActive(config: VaultPledgeConfig, now = new Date()): boolean {
  if (config.status !== 'active') return false;
  return Date.parse(config.releaseAt) > now.getTime();
}

export function pledgeAppliesToSite(config: VaultPledgeConfig, site: 'stake_us' | 'nuts'): boolean {
  if (!isPledgeActive(config)) return false;
  return config.site === 'both' || config.site === site;
}

export function autoReleaseIfExpired(
  config: VaultPledgeConfig,
  now = new Date(),
): VaultPledgeConfig {
  if (config.status !== 'active') return config;
  if (Date.parse(config.releaseAt) <= now.getTime()) {
    return { ...config, status: 'released' };
  }
  return config;
}
```

- [ ] **Step 2: Tests**

```typescript
// packages/shared/src/vault-pledge.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVaultPledgeConfig,
  isPledgeActive,
  pledgeAppliesToSite,
  autoReleaseIfExpired,
  buildPledgeReleaseAt,
} from './vault-pledge.js';

describe('normalizeVaultPledgeConfig', () => {
  it('clamps duration', () => {
    const c = normalizeVaultPledgeConfig({ durationMinutes: 5 });
    assert.equal(c.durationMinutes, 15);
  });
});

describe('isPledgeActive', () => {
  it('false when released', () => {
    const c = normalizeVaultPledgeConfig({ status: 'released' });
    assert.equal(isPledgeActive(c), false);
  });

  it('true when releaseAt in future', () => {
    const future = buildPledgeReleaseAt(60);
    const c = normalizeVaultPledgeConfig({ releaseAt: future, status: 'active' });
    assert.equal(isPledgeActive(c), true);
  });
});

describe('pledgeAppliesToSite', () => {
  it('both matches stake', () => {
    const c = normalizeVaultPledgeConfig({ site: 'both', durationMinutes: 60 });
    assert.equal(pledgeAppliesToSite(c, 'stake_us'), true);
  });
});

describe('autoReleaseIfExpired', () => {
  it('marks released when past', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const c = normalizeVaultPledgeConfig({ releaseAt: past, status: 'active' });
    assert.equal(autoReleaseIfExpired(c).status, 'released');
  });
});
```

- [ ] **Step 3: Export**

Add to `packages/shared/src/index.ts`:

```typescript
export * from './vault-pledge.js';
```

- [ ] **Step 4: Run tests**

```bash
cd packages/shared && pnpm build && pnpm test
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/vault-pledge.ts packages/shared/src/vault-pledge.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): vault pledge config normalizer"
```

---

## Task 3: API — vault_pledge rule type

**Files:**
- Modify: `apps/api/src/routes/vault.ts`

- [ ] **Step 1: Extend validation**

Replace `validateRulePayload` with rule-type dispatch:

```typescript
import {
  normalizeSessionCapConfig,
  normalizeVaultPledgeConfig,
  autoReleaseIfExpired,
} from '@tiltcheck/shared';

function validateRulePayload(body: {
  ruleType?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}): { ruleType: string; enabled: boolean; config: Record<string, unknown> } | string {
  const ruleType = body.ruleType ?? 'session_cap';
  if (ruleType === 'session_cap') {
    return {
      ruleType,
      enabled: body.enabled !== false,
      config: normalizeSessionCapConfig(body.config ?? {}),
    };
  }
  if (ruleType === 'vault_pledge') {
    const normalized = normalizeVaultPledgeConfig(body.config ?? {});
    if (normalized.status === 'active' && Date.parse(normalized.releaseAt) <= Date.now()) {
      return 'releaseAt must be in the future for active pledge';
    }
    return {
      ruleType,
      enabled: body.enabled !== false,
      config: normalized,
    };
  }
  return `Unsupported ruleType: ${ruleType}`;
}
```

- [ ] **Step 2: Auto-release on GET**

In `vaultRoutes.get('/')`, after `listVaultRules`, map rules:

```typescript
const rules = (await listVaultRules(user.id)).map((rule) => {
  if (rule.ruleType !== 'vault_pledge') return rule;
  const released = autoReleaseIfExpired(
    normalizeVaultPledgeConfig(rule.config),
  );
  if (released.status !== rule.config.status) {
    void updateVaultRule(user.id, rule.id, { config: released });
    return { ...rule, config: released };
  }
  return rule;
});
return c.json({ rules });
```

Import `updateVaultRule` from `@tiltcheck/db`.

- [ ] **Step 3: PATCH allows vault_pledge cancel**

In PATCH handler, when `body.ruleType === 'vault_pledge'` or existing rule is vault_pledge, use `normalizeVaultPledgeConfig` instead of session cap normalizer.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/vault.ts
git commit -m "feat(api): vault_pledge vault rule type"
```

---

## Task 4: Dashboard Vault Pledge card

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Add state + load pledge rule**

```typescript
import {
  normalizeVaultPledgeConfig,
  isPledgeActive,
  buildPledgeReleaseAt,
  type VaultPledgeSite,
} from '@tiltcheck/shared';

const PLEDGE_DISCLOSURE =
  'Works in this browser with TiltCheck installed. You can still withdraw on mobile or another browser — a nudge from past-you, not a bank lock.';

// state
const [pledgeMinutes, setPledgeMinutes] = useState(240);
const [pledgeSite, setPledgeSite] = useState<VaultPledgeSite>('both');
const [pledgeNote, setPledgeNote] = useState('');
const [pledgeStatus, setPledgeStatus] = useState<'idle' | 'saving' | 'error'>('idle');

const pledgeRule = vaultRules.find((r) => r.ruleType === 'vault_pledge');
const pledgeConfig = pledgeRule ? normalizeVaultPledgeConfig(pledgeRule.config) : null;
const pledgeActive = pledgeConfig ? isPledgeActive(pledgeConfig) : false;
```

In `refreshVault`, after setVaultRules, pre-fill from last pledge config if present.

- [ ] **Step 2: savePledge + cancelPledge**

```typescript
async function savePledge() {
  setPledgeStatus('saving');
  const releaseAt = buildPledgeReleaseAt(pledgeMinutes);
  const res = await apiFetch('/vault', {
    method: 'POST',
    body: JSON.stringify({
      ruleType: 'vault_pledge',
      enabled: true,
      config: {
        durationMinutes: pledgeMinutes,
        releaseAt,
        site: pledgeSite,
        futureMeNote: pledgeNote,
        status: 'active',
        startedAt: new Date().toISOString(),
      },
    }),
  });
  setPledgeStatus(res.ok ? 'idle' : 'error');
  if (res.ok) await refreshVault();
}

async function cancelPledge() {
  if (!pledgeRule) return;
  setPledgeStatus('saving');
  const res = await apiFetch(`/vault/${pledgeRule.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ruleType: 'vault_pledge',
      config: { ...pledgeConfig, status: 'cancelled' },
    }),
  });
  setPledgeStatus(res.ok ? 'idle' : 'error');
  if (res.ok) await refreshVault();
}
```

- [ ] **Step 3: UI card** (below My Line card)

- Eyebrow: `Vault pledge`
- Title: `Lock the vault bag`
- Copy: giveback framing + `PLEDGE_DISCLOSURE`
- Fields: duration presets (15/60/240/1440 + number input), site select, note textarea
- Active state: countdown to `releaseAt`, Cancel with checkbox `I accept I'm breaking my pledge` + button
- CTA: `Start pledge` when inactive

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(app)/dashboard/page.tsx
git commit -m "feat(web): dashboard vault pledge card"
```

---

## Task 5: Settings pledge defaults

**Files:**
- Modify: `apps/web/src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Add section** `#vault-pledge`

Store defaults in `localStorage` key `tc_pledge_defaults` (v1 — no DB migration):

```typescript
const PLEDGE_DEFAULTS_KEY = 'tc_pledge_defaults';

type PledgeDefaults = { durationMinutes: number; futureMeNote: string };

// load on mount, save on change
```

Copy: link to `/dashboard` to arm active pledge; show disclosure text.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/(app)/settings/page.tsx
git commit -m "feat(web): vault pledge defaults in settings"
```

---

## Task 6: Extension vault-sync helpers

**Files:**
- Modify: `apps/extension/src/vault-sync.ts`

- [ ] **Step 1: Add getters**

```typescript
import { normalizeVaultPledgeConfig, isPledgeActive, pledgeAppliesToSite } from '@tiltcheck/shared';

export function getVaultPledgeConfig(rules: VaultRuleSnapshot[]): ReturnType<typeof normalizeVaultPledgeConfig> | null {
  const rule = rules.find((r) => r.ruleType === 'vault_pledge' && r.enabled);
  if (!rule) return null;
  const config = normalizeVaultPledgeConfig(rule.config);
  return isPledgeActive(config) ? config : null;
}

export function getActivePledgeForSite(
  rules: VaultRuleSnapshot[],
  site: 'stake_us' | 'nuts',
): ReturnType<typeof normalizeVaultPledgeConfig> | null {
  const config = getVaultPledgeConfig(rules);
  if (!config) return null;
  return pledgeAppliesToSite(config, site) ? config : null;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/extension/src/vault-sync.ts
git commit -m "feat(extension): vault pledge config helpers"
```

---

## Task 7: Pledge overlay + withdraw guard

**Files:**
- Create: `apps/extension/src/vault-pledge-overlay.ts`
- Create: `apps/extension/src/vault-pledge-guard.ts`
- Modify: `apps/extension/src/content.ts`

- [ ] **Step 1: Overlay module**

`showVaultPledgeOverlay(config)` — full-screen `#000`, large countdown to `releaseAt`, note, disclosure footer, optional `onCancel` not exposed (cancel web-only). On show, call `openTouchGrassHub('pledge', { until: releaseAt, note })` from `touch-grass-link.ts` (same pattern as tilt lockout in `enforcement.ts`).

`dismissVaultPledgeOverlay()` — remove overlay.

- [ ] **Step 2: Guard module**

```typescript
export function startVaultPledgeGuard(
  getRules: () => VaultRuleSnapshot[],
  getSite: () => 'stake_us' | 'nuts' | null,
): () => void {
  // MutationObserver on document.body
  // On click capture phase: if target matches withdraw heuristic, preventDefault + stopPropagation + show overlay
  // Poll every 1s: if pledge expired, dismiss overlay
  return () => { /* teardown */ };
}
```

`matchesWithdrawTarget(el: Element): boolean` — walk up for button/link, match `/withdraw/i` text within vault-related containers (`[class*="vault" i]`, `[data-testid*="vault" i]`).

- [ ] **Step 3: Wire in content.ts**

After `applyStoredState`, on stake/nuts hostnames only:

```typescript
import { startVaultPledgeGuard } from './vault-pledge-guard.js';

let stopPledgeGuard: (() => void) | null = null;

function applyStoredState(stored: Record<string, unknown>) {
  // ...existing...
  stopPledgeGuard?.();
  const site = hostname.includes('stake.us') ? 'stake_us' : hostname.includes('nuts.gg') ? 'nuts' : null;
  if (site && loggedIn && !demoMode) {
    stopPledgeGuard = startVaultPledgeGuard(() => vaultRules, () => site);
  }
}
```

- [ ] **Step 4: Build extension**

```bash
cd apps/extension && node build.js
```

- [ ] **Step 5: Commit**

```bash
git add apps/extension/src/vault-pledge-overlay.ts apps/extension/src/vault-pledge-guard.ts apps/extension/src/content.ts
git commit -m "feat(extension): vault pledge withdraw guard"
```

---

## Task 8: Popup pledge status

**Files:**
- Modify: `apps/extension/src/popup.ts`
- Modify: `apps/extension/src/manifest.json` (version `2.3.0`)

- [ ] **Step 1: Add renderPledgeLine**

```typescript
import { getVaultPledgeConfig } from './vault-sync.js';
import { isPledgeActive } from '@tiltcheck/shared';

function renderPledgeLine(rules: VaultRuleSnapshot[]): string {
  const rule = rules.find((r) => r.ruleType === 'vault_pledge' && r.enabled);
  if (!rule) return 'Vault pledge: none';
  const config = normalizeVaultPledgeConfig(rule.config);
  if (!isPledgeActive(config)) return 'Vault pledge: none';
  const ms = Date.parse(config.releaseAt) - Date.now();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `Vault pledge: ${h}h ${m}m left`;
}
```

Show in status sub-line or separate muted row.

- [ ] **Step 2: Commit + version bump**

```bash
git add apps/extension/src/popup.ts apps/extension/src/manifest.json
git commit -m "feat(extension): popup vault pledge status (v2.3.0)"
```

---

## Task 9: Playwright smoke (optional but recommended)

**Files:**
- Create: `apps/web/e2e/vault-pledge.spec.ts`

- [ ] **Step 1: Test dashboard pledge form renders for authed user**

Use same cookie fixture pattern as `logged-in-ia.spec.ts`; assert `Vault pledge` heading and disclosure text present.

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/vault-pledge.spec.ts
git commit -m "test(web): vault pledge dashboard smoke"
```

---

## Task 10: Manual staging gate

- [ ] Arm 15m pledge on dashboard → Sync in popup
- [ ] Open Stake.us → attempt vault withdraw → full-screen pledge overlay
- [ ] Cancel pledge on dashboard with checkbox → withdraw no longer blocked
- [ ] Confirm `/bonuses` redirects to `/dashboard`
- [ ] Confirm nav has no Bonuses link

---

## Spec coverage checklist

| Spec § | Task |
|--------|------|
| §2 disclosure copy | Tasks 4, 5, 7 |
| §3 user model | Tasks 2, 4 |
| §4.1 data model | Tasks 2, 3 |
| §4.3 extension enforcement | Task 7 |
| §4.4 web surfaces | Tasks 4, 5, 8 |
| §4.5 bonuses removal | Task 1 |
| §5 API | Task 3 |
| §7 error handling | Task 3 GET auto-release, Task 7 poll |
| §12 success criteria | Task 10 |

---

## Update spec status

After plan merge, set spec header `**Status:** Approved` in `2026-05-28-vault-pledge-timer-design.md`.
