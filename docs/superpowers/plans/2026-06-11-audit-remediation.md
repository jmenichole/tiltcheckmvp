# Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close P0 findings from the 2026-06-11 full-project audit (security, activation, deploy, trust/copy) so Phase 2 can pass the staging ship gate and Railway deploys succeed.

**Architecture:** Ship in four tracks with frequent commits: (1) deploy hygiene, (2) auth security without JWT-in-URL, (3) activation/trust fixes on web + extension, (4) API production guards. Stake category onboarding is **out of scope** — see follow-up spec `docs/superpowers/specs/2026-06-11-stake-category-onboarding-design.md` (write during brainstorming before that build).

**Tech Stack:** Hono (`apps/api`), Next.js App Router (`apps/web`), Chrome MV3 (`apps/extension`), `@tiltcheck/shared`, Supabase migrations, Vitest/node:test in `packages/shared`, Playwright smoke in `apps/web/e2e`.

**Build order:** Task 0 → Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8. Do not merge Task 7 (landing CTA reorder) before Task 1 (auth) is green.

**Source:** Full project audit 2026-06-11 (PMF, RG, landing UX, frontend, backend, security review).

---

## File map

| File | Responsibility |
|------|----------------|
| `.railwayignore`, `.gitignore` | Exclude Playwright/.next from `railway up` tarball |
| `packages/shared/src/safe-redirect.ts` | Shared `safeRedirectPath()` for web + API |
| `apps/api/src/auth-handoff.ts` | One-time OAuth exchange codes (in-memory, 60s TTL) |
| `apps/api/src/routes/auth.ts` | OAuth callback, `/auth/exchange`, error HTML escape |
| `apps/api/src/session.ts` | Fail boot in production if default/missing secret |
| `apps/api/src/lib/email-ingest-controls.ts` | Fail closed when secret missing in production |
| `apps/api/src/index.ts` | Call session secret guard on boot |
| `apps/web/src/app/api/auth/complete/route.ts` | Exchange code server-side, set cookie |
| `apps/web/src/app/login/page.tsx` | Use `safeRedirectPath` before OAuth |
| `apps/web/src/lib/auth-redirect.ts` | Re-export or delegate to shared |
| `apps/extension/src/game-exclusion-watcher.ts` | Surface sign-in-needed on matched games when logged out |
| `apps/extension/src/content.ts` | Toast copy for sign-in-needed state |
| `apps/web/src/components/DashboardCommandCenter.tsx` | Fix tilt pillar `done` logic |
| `apps/web/src/components/LandingHeroActions.tsx` | Login-first CTA hierarchy |
| `apps/web/src/components/OnboardingWizard.tsx` | Remove loss-streak claims (until `recordBet` ships) |
| `apps/web/src/app/(app)/settings/page.tsx` | Same copy trim on sensitivity cards |
| `supabase/migrations/20260611120000_vault_rule_unique.sql` | `UNIQUE (user_id, rule_type)` on `vault_rules` |
| `packages/shared/src/game-exclusion.test.ts` | Tests for path-prefix matcher (prep for Stake plan; optional in this plan) |

---

## Task 0: Deploy hygiene (commit ignore files)

**Files:**
- Create: `.railwayignore` (may already exist locally)
- Modify: `.gitignore`

- [ ] **Step 1:** Verify `.railwayignore` excludes `apps/web/.playwright-browsers`, `.next`, `node_modules`, `test-results`, `*.tsbuildinfo`.

- [ ] **Step 2:** Verify `.gitignore` includes the same Playwright paths.

- [ ] **Step 3:** Commit and push (triggers GitHub → Railway deploy — preferred over `railway up`):

```bash
git add .railwayignore .gitignore
git commit -m "chore: exclude playwright and build artifacts from Railway CLI uploads"
git push origin main
```

- [ ] **Step 4:** Confirm Railway **web** service rebuilds from GitHub (Touch Grass + onboarding visible on production URL).

**Do not use `railway up` for routine deploys** — CLI tarball limit ~40 MB.

---

## Task 1: Shared safe redirect helper

**Files:**
- Create: `packages/shared/src/safe-redirect.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/shared/src/safe-redirect.test.ts`
- Modify: `apps/web/src/lib/auth-redirect.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/shared/src/safe-redirect.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { safeRedirectPath } from './safe-redirect.js';

describe('safeRedirectPath', () => {
  it('allows normal paths', () => {
    assert.equal(safeRedirectPath('/dashboard'), '/dashboard');
  });
  it('blocks protocol-relative open redirect', () => {
    assert.equal(safeRedirectPath('//evil.com'), '/dashboard');
  });
  it('blocks missing slash', () => {
    assert.equal(safeRedirectPath('https://evil.com'), '/dashboard');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tiltcheck/shared test`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// packages/shared/src/safe-redirect.ts
const DEFAULT = '/dashboard';

export function safeRedirectPath(
  redirect: string | null | undefined,
  fallback: string = DEFAULT,
): string {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return fallback;
  }
  if (redirect.includes('\\') || redirect.includes('%5c')) {
    return fallback;
  }
  return redirect;
}
```

```typescript
// packages/shared/src/index.ts — add:
export * from './safe-redirect.js';
```

```typescript
// apps/web/src/lib/auth-redirect.ts — replace local implementation:
import { safeRedirectPath as sharedSafeRedirectPath } from '@tiltcheck/shared';

const DEFAULT_AUTHED_REDIRECT = '/dashboard';

export function hasSessionCookie(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function safeRedirectPath(
  redirect: string | null | undefined,
  fallback: string = DEFAULT_AUTHED_REDIRECT,
): string {
  return sharedSafeRedirectPath(redirect, fallback);
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @tiltcheck/shared test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/safe-redirect.ts packages/shared/src/safe-redirect.test.ts packages/shared/src/index.ts apps/web/src/lib/auth-redirect.ts
git commit -m "fix(shared): add safeRedirectPath and block open redirects"
```

---

## Task 2: One-time auth code (remove JWT from URL)

**Files:**
- Create: `apps/api/src/auth-handoff.ts`
- Modify: `apps/api/src/routes/auth.ts`
- Modify: `apps/web/src/app/api/auth/complete/route.ts`

- [ ] **Step 1: Add handoff code store**

```typescript
// apps/api/src/auth-handoff.ts
const CODE_TTL_MS = 60_000;
const codes = new Map<string, { token: string; expiresAt: number }>();

export function mintAuthHandoffCode(token: string): string {
  const code = crypto.randomUUID();
  codes.set(code, { token, expiresAt: Date.now() + CODE_TTL_MS });
  return code;
}

export function consumeAuthHandoffCode(code: string): string | null {
  const entry = codes.get(code);
  codes.delete(code);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.token;
}
```

- [ ] **Step 2: Change web OAuth callback redirect** in `apps/api/src/routes/auth.ts` (web branch only, ~line 150):

```typescript
import { mintAuthHandoffCode, consumeAuthHandoffCode } from '../auth-handoff.js';
import { safeRedirectPath } from '@tiltcheck/shared';

// Replace web handoff block:
const redirectPath = safeRedirectPath(entry.redirect, '/dashboard');
const code = mintAuthHandoffCode(token);
const handoff = new URL('/api/auth/complete', webUrl());
handoff.searchParams.set('code', code);
handoff.searchParams.set('redirect', redirectPath);
return c.redirect(handoff.toString());
```

- [ ] **Step 3: Add exchange endpoint** (same file):

```typescript
authRoutes.get('/exchange', (c) => {
  const code = c.req.query('code') ?? '';
  const token = consumeAuthHandoffCode(code);
  if (!token) {
    return c.json({ error: 'invalid_or_expired' }, 401);
  }
  return c.json({ token });
});
```

- [ ] **Step 4: Update web complete route**

```typescript
// apps/web/src/app/api/auth/complete/route.ts
import { safeRedirectPath } from '@tiltcheck/shared';

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirect = safeRedirectPath(url.searchParams.get('redirect'));
  const origin = webOrigin();

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_token', origin));
  }

  const exchange = await fetch(`${apiBase()}/auth/exchange?code=${encodeURIComponent(code)}`, {
    cache: 'no-store',
  });
  if (!exchange.ok) {
    return NextResponse.redirect(new URL('/login?error=missing_token', origin));
  }
  const { token } = (await exchange.json()) as { token?: string };
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_token', origin));
  }

  const store = await cookies();
  store.set('tc_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.redirect(new URL(redirect, `${origin}/`));
}
```

- [ ] **Step 5: Manual test**

1. Start API + web locally.
2. Complete Discord login on web.
3. Confirm browser URL never contains `token=` query param (only `code=`).
4. Confirm landing on `/dashboard` with session cookie set.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth-handoff.ts apps/api/src/routes/auth.ts apps/web/src/app/api/auth/complete/route.ts
git commit -m "fix(auth): exchange one-time code instead of JWT in redirect URL"
```

---

## Task 3: OAuth error XSS + login redirect hardening

**Files:**
- Modify: `apps/api/src/routes/auth.ts`
- Modify: `apps/web/src/app/login/page.tsx`

- [ ] **Step 1: Escape OAuth error in API callback** (~line 60):

```typescript
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// In callback:
if (error) {
  return c.html(`<p>Discord auth error: ${escapeHtml(error)}</p>`);
}
```

- [ ] **Step 2: Harden login page redirect** (`apps/web/src/app/login/page.tsx`):

```typescript
import { safeRedirectPath } from '@tiltcheck/shared';

// Inside LoginContent:
const safeRedirect = safeRedirectPath(redirect);
const loginUrl = `${apiBaseUrl()}/auth/discord/login?source=web&redirect=${encodeURIComponent(safeRedirect)}`;
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/auth.ts apps/web/src/app/login/page.tsx
git commit -m "fix(auth): escape OAuth errors and safe redirect on login"
```

---

## Task 4: Production secret guards

**Files:**
- Modify: `apps/api/src/session.ts`
- Modify: `apps/api/src/lib/email-ingest-controls.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Session secret boot guard**

```typescript
// apps/api/src/session.ts — add at top after imports:
const DEV_FALLBACK = 'dev-secret-change-me-32chars-min';

export function assertProductionSessionSecret(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret === DEV_FALLBACK || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set to a random 32+ char value in production');
  }
}

// In secret():
export function secretKey(): Uint8Array {
  const raw = process.env.SESSION_SECRET ?? DEV_FALLBACK;
  return new TextEncoder().encode(raw);
}
// Update signSession/verifySession to use secretKey()
```

- [ ] **Step 2: Email ingest fail-closed in production**

```typescript
// apps/api/src/lib/email-ingest-controls.ts
export function assertEmailIngestSecret(c: Context): boolean {
  const secret = process.env.EMAIL_INGEST_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') return false;
    return true;
  }
  const auth = c.req.header('authorization');
  const bearer = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const headerKey = c.req.header('x-email-ingest-key')?.trim() ?? '';
  return bearer === secret || headerKey === secret;
}
```

- [ ] **Step 3: Call guard on API boot** (`apps/api/src/index.ts` first line of serve):

```typescript
import { assertProductionSessionSecret } from './session.js';
assertProductionSessionSecret();
```

- [ ] **Step 4: Document env in Railway** — set `EMAIL_INGEST_SECRET` on API service if ingest is used.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/session.ts apps/api/src/lib/email-ingest-controls.ts apps/api/src/index.ts
git commit -m "fix(api): require SESSION_SECRET and ingest secret in production"
```

---

## Task 5: Fix `/auth/me` when user row missing

**Files:**
- Modify: `apps/api/src/routes/auth.ts`

- [ ] **Step 1: Return 401 when DB user missing**

```typescript
// authRoutes.get('/me', ...)
const user = await findUserById(session.userId);
if (!user) {
  return c.json({ user: null }, 401);
}
return c.json({ user });
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/routes/auth.ts
git commit -m "fix(api): return 401 from /auth/me when user row is missing"
```

---

## Task 6: Extension — sign-in prompt on game match when logged out

**Files:**
- Modify: `apps/extension/src/game-exclusion-watcher.ts`
- Modify: `apps/extension/src/content.ts`

- [ ] **Step 1: Change logged-out match behavior** in `game-exclusion-watcher.ts`:

```typescript
if (!this.options.getLoggedIn()) {
  this.emit({ matched: match, status: 'demo-banner' });
  return;
}
```

(Uses existing `demo-banner` path — update copy in content handler.)

- [ ] **Step 2: In `content.ts`**, find `demo-banner` / game warn handler and when `!loggedIn && matched`, show toast:

```typescript
showPageToast(
  'tiltcheck-signin-hint',
  'Game on your block list. Sign in on TiltCheck to enforce — open the side panel.',
  { durationMs: 8000 },
);
```

- [ ] **Step 3: Rebuild extension**

Run: `cd apps/extension && node build.js`

- [ ] **Step 4: Commit**

```bash
git add apps/extension/src/game-exclusion-watcher.ts apps/extension/src/content.ts
git commit -m "fix(extension): prompt sign-in when blocked game matches while logged out"
```

---

## Task 7: Dashboard protection score honesty

**Files:**
- Modify: `apps/web/src/components/DashboardCommandCenter.tsx`

- [ ] **Step 1: Fix tilt pillar `done` flag**

```typescript
{
  id: 'tilt',
  label: 'Tilt brakes',
  value: RISK_SHORT[props.riskProfile] ?? props.riskProfile,
  done: props.onboardingComplete,
  href: '/settings',
  cta: 'Sensitivity',
},
```

- [ ] **Step 2: Add extension sync hint** in command center footer (one line):

```tsx
<p className="public-page-card__copy">
  Extension syncs when you open the side panel on a TiltCheck tab — you are already signed in on the web.
</p>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/DashboardCommandCenter.tsx
git commit -m "fix(web): honest tilt pillar and extension sync copy on dashboard"
```

---

## Task 8: Landing CTA — login before install

**Files:**
- Modify: `apps/web/src/components/LandingHeroActions.tsx`

- [ ] **Step 1: Reorder desktop + mobile CTAs** (keep funnel attributes; swap primary):

Primary button → `LOG IN WITH DISCORD` → `/login?redirect=/dashboard` with `btn-primary`

Secondary → `INSTALL THE EXTENSION` → `/extension` with `btn-secondary` or `btn-ghost`

Keep `CHECK CASINO TRUST` as ghost.

```tsx
<Link
  href="/login?redirect=/dashboard"
  className="btn btn-primary"
  data-funnel-event="landing_login_click"
  data-funnel-source="web-home-hero"
  data-funnel-label="Log in with Discord"
>
  LOG IN WITH DISCORD
</Link>
<Link
  href="/extension"
  className="btn btn-ghost"
  data-funnel-event="landing_install_click"
  data-funnel-source="web-home-hero"
  data-funnel-label="Install the Extension"
>
  INSTALL THE EXTENSION
</Link>
```

Mirror the same order in `hero-actions--mobile`.

- [ ] **Step 2: Run smoke e2e**

Run: `cd apps/web && pnpm test:e2e` (or CI-equivalent)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/LandingHeroActions.tsx
git commit -m "fix(web): login-first landing CTA to match web-handoff activation"
```

---

## Task 9: Remove loss-streak copy until `recordBet` is wired

**Files:**
- Modify: `apps/web/src/components/OnboardingWizard.tsx`
- Modify: `apps/web/src/app/(app)/settings/page.tsx` (sensitivity card copy if present)

- [ ] **Step 1: In `OnboardingWizard.tsx` SENSITIVITY_CARDS**, change conservative copy example from loss streak to click-only:

```typescript
example: 'Touch Grass when: 10+ clicks in 5 seconds',
// Remove "or loss streaks" from copy fields if present
```

- [ ] **Step 2: Grep settings sensitivity copy**

Run: `rg "loss streak" apps/web`

Replace with click-pacing language only.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/OnboardingWizard.tsx apps/web/src/app/(app)/settings/page.tsx
git commit -m "fix(web): align tilt copy with live click detection only"
```

---

## Task 10: Vault rule uniqueness migration

**Files:**
- Create: `supabase/migrations/20260611120000_vault_rule_unique.sql`

- [ ] **Step 1: Write migration**

```sql
-- Deduplicate session_cap / vault_pledge per user before unique constraint
DELETE FROM vault_rules a
USING vault_rules b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.rule_type = b.rule_type;

ALTER TABLE vault_rules
  ADD CONSTRAINT vault_rules_user_id_rule_type_key UNIQUE (user_id, rule_type);
```

- [ ] **Step 2: Apply on Supabase** (SQL editor or `supabase db push`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260611120000_vault_rule_unique.sql
git commit -m "fix(db): unique vault rule per user and rule_type"
```

---

## Task 11: Extension host trust tightening (P1)

**Files:**
- Modify: `apps/extension/src/extension-auth.ts`

- [ ] **Step 1: Replace subdomain wildcard**

```typescript
function isTiltCheckWebHost(): boolean {
  try {
    const webHost = new URL(webBaseUrl()).hostname;
    return location.hostname === webHost;
  } catch {
    return false;
  }
}
```

Remove `|| location.hostname.endsWith('tiltcheck.me')` from `isTiltCheckWebHost` and `isTiltCheckWebHostname`.

- [ ] **Step 2: On OAuth callback path, always require `trustedApiOriginAsync`**

Remove bypass `onCallback && !(await trustedApiOriginAsync(...))` — require API origin even on callback-shaped paths unless `location.origin` matches resolved API origin.

- [ ] **Step 3: Rebuild extension, commit**

```bash
git add apps/extension/src/extension-auth.ts
git commit -m "fix(extension): tighten web host trust for auth handoff"
```

---

## Task 12: Dead code cleanup (P2, optional same PR or follow-up)

**Files:**
- Delete: `apps/web/src/components/DashboardProtectionAside.tsx` (if zero imports — verify with `rg DashboardProtectionAside`)

- [ ] **Step 1: Verify unused**

Run: `rg "DashboardProtectionAside" apps/web`

- [ ] **Step 2: Delete file if unused only**

- [ ] **Step 3: Commit**

```bash
git rm apps/web/src/components/DashboardProtectionAside.tsx
git commit -m "chore(web): remove unused DashboardProtectionAside"
```

---

## Verification checklist (staging ship gate)

After Tasks 0–9 on staging:

- [ ] Web login completes without `token=` in browser history (only `code=`).
- [ ] `//evil.com` redirect attempts land on `/dashboard`.
- [ ] API refuses boot without `SESSION_SECRET` when `NODE_ENV=production`.
- [ ] Touch Grass hub shows 12 break cards on deployed web URL.
- [ ] Onboarding wizard completes with `demoMode: false` and session cap armed.
- [ ] Extension side panel shows signed-in after dashboard visit (handoff).
- [ ] Open blocked game on test casino tab → lockout or sign-in toast when logged out.
- [ ] Tilt pillar on dashboard not checked until onboarding complete.

---

## Deferred (separate plans — do not block this PR)

| Item | Plan |
|------|------|
| Stake category onboarding + path-prefix matcher | `docs/superpowers/specs/2026-06-11-stake-category-onboarding-design.md` → implementation plan |
| `recordBet()` wiring for loss-streak tilt | Extension content script + casino hooks |
| Redis/DB OAuth state for multi-replica Railway | Infra plan |
| Rate limiting on `/rgaas/*` and `/tools/*` | API middleware plan |
| `notificationsEnabled` UI removal or wiring | Settings cleanup |
| One-time extension-handoff codes (replace JWT JSON) | Security P2 |

---

## Spec self-review

| Check | Result |
|-------|--------|
| Placeholder scan | No TBD/TODO in tasks |
| Spec coverage | Maps to all audit P0 items |
| Scope | Single shippable remediation wave; Stake categories deferred |
| Type/name consistency | `safeRedirectPath`, `mintAuthHandoffCode`, `consumeAuthHandoffCode` used consistently |
| Contradictions | Landing login-first aligns with web-handoff extension flow from `73b1e7f` |

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-11-audit-remediation.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** — execute tasks in this session using executing-plans, batch with checkpoints  

**Which approach?**
