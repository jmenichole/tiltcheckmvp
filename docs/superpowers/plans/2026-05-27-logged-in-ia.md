# Logged-In IA (Hybrid+) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user has a `tc_session` cookie, the home page shows a vault-aware command center, `/login` redirects away, and nav prioritizes Account — while casinos/bonuses/tools stay public.

**Architecture:** Server branch on `/` via `cookies()`; client `LandingAuthedHome` confirms session with `/auth/me` and loads vault state; pure redirect helpers shared with middleware; nav conditionals in `SiteNav.tsx` only.

**Tech Stack:** Next.js 16 App Router, React 19 client components, existing `apiFetch` + Hono API, Playwright e2e.

**Spec:** [2026-05-27-logged-in-ia-design.md](../specs/2026-05-27-logged-in-ia-design.md)

---

## File map

| File | Responsibility |
|------|----------------|
| `apps/web/src/lib/auth-redirect.ts` | Pure helpers: safe redirect path, session cookie check |
| `apps/web/src/middleware.ts` | Protected routes + authed `/login` redirect |
| `apps/web/src/components/LandingMarketingHome.tsx` | Full marketing landing (extracted from `page.tsx`) |
| `apps/web/src/components/LandingAuthedHome.tsx` | Command center UI + `/auth/me` + `/vault` |
| `apps/web/src/app/page.tsx` | Server cookie gate → marketing or authed |
| `apps/web/src/components/SiteNav.tsx` | Account-first menu, deduped links, conditional labels |
| `apps/web/src/app/globals.css` | Optional command-center spacing |
| `apps/web/e2e/logged-in-ia.spec.ts` | E2e coverage for middleware + marketing smoke |

---

### Task 1: Auth redirect helpers

**Files:**
- Create: `apps/web/src/lib/auth-redirect.ts`
- Modify: `apps/web/src/middleware.ts`
- Test: `apps/web/e2e/logged-in-ia.spec.ts`

- [ ] **Step 1: Add redirect helpers**

```typescript
// apps/web/src/lib/auth-redirect.ts
const DEFAULT_AUTHED_REDIRECT = '/dashboard';

export function hasSessionCookie(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function safeRedirectPath(
  redirect: string | null | undefined,
  fallback: string = DEFAULT_AUTHED_REDIRECT,
): string {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return fallback;
  }
  return redirect;
}
```

- [ ] **Step 2: Extend middleware**

```typescript
// apps/web/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hasSessionCookie, safeRedirectPath } from '@/lib/auth-redirect';

const protectedPrefixes = ['/dashboard', '/settings'];

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const session = request.cookies.get('tc_session');

  if (pathname === '/login' && hasSessionCookie(session?.value)) {
    const target = safeRedirectPath(searchParams.get('redirect'));
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (!protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (!hasSessionCookie(session?.value)) {
    const login = new URL('/login', request.url);
    login.searchParams.set('redirect', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/dashboard/:path*', '/settings'],
};
```

- [ ] **Step 3: Write e2e test for authed `/login` redirect**

```typescript
// apps/web/e2e/logged-in-ia.spec.ts
import { test, expect } from '@playwright/test';

test.describe('logged-in IA', () => {
  test('authed /login redirects to /dashboard', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'tc_session',
        value: 'e2e-stub-session',
        domain: 'localhost',
        path: '/',
      },
    ]);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('authed /login respects safe redirect param', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'tc_session',
        value: 'e2e-stub-session',
        domain: 'localhost',
        path: '/',
      },
    ]);
    await page.goto('/login?redirect=/settings');
    await expect(page).toHaveURL(/\/settings$/);
  });
});
```

- [ ] **Step 4: Run e2e (middleware tests only)**

```bash
cd apps/web && pnpm exec playwright test e2e/logged-in-ia.spec.ts --grep "authed /login"
```

Expected: PASS (redirect happens before login page renders; stub cookie is enough).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auth-redirect.ts apps/web/src/middleware.ts apps/web/e2e/logged-in-ia.spec.ts
git commit -m "feat(web): redirect authed users away from /login"
```

---

### Task 2: Extract marketing landing component

**Files:**
- Create: `apps/web/src/components/LandingMarketingHome.tsx`
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Move marketing JSX into `LandingMarketingHome.tsx`**

Cut the entire current `Home` return from `apps/web/src/app/page.tsx` (hero, step cards, `LandingSessionMock`) into:

```typescript
// apps/web/src/components/LandingMarketingHome.tsx
import LandingHeroActions from '@/components/LandingHeroActions';
import LandingSessionMock from '@/components/LandingSessionMock';

const coreJobs = [
  {
    step: '01',
    title: 'Kill the Auto-Pilot',
    description: 'Tracks click-speed and bet pacing. Wakes you up when you play like a bot.',
  },
  {
    step: '02',
    title: 'Read the Room',
    description: 'Flags sus pacing and pressure loops while you are still in the session.',
  },
  {
    step: '03',
    title: 'Enforce the Exit',
    description: 'Set your line. We enforce it — not passive warnings.',
  },
];

export default function LandingMarketingHome() {
  return (
    <main className="landing-page">
      <section className="hero-surface">
        <div className="landing-shell landing-hero-centered">
          <h1 className="landing-hero-title landing-hero-title--centered">
            HOUSE ALWAYS WINS?
            <br />
            FUCK THAT.
          </h1>
          <div className="landing-hero-kicker-block">
            <span className="landing-hero-kicker__line">The math isn&apos;t rigged. Your dopamine is.</span>
            <span className="landing-hero-kicker__line landing-hero-kicker__line--second">
              The house banks on your tilt.
            </span>
          </div>
          <p className="landing-hero-subtitle landing-hero-subtitle--centered landing-hero-subtitle--lede">
            TiltCheck is the read-only friction layer that tracks session drift in real time and pulls
            you out before you rug your own bankroll.
          </p>
          <LandingHeroActions />
          <p className="hero-privacy-guarantee">
            Read-only. No wallet passwords. Your logs stay local.
          </p>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-grid public-page-grid--3">
            {coreJobs.map((job) => (
              <article key={job.step} className="public-page-card">
                <p className="public-page-card__eyebrow">Step {job.step}</p>
                <h3 className="public-page-card__title">{job.title}</h3>
                <p className="public-page-card__copy">{job.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <LandingSessionMock />
    </main>
  );
}
```

- [ ] **Step 2: Slim `page.tsx` to marketing-only temporarily**

```typescript
// apps/web/src/app/page.tsx
import LandingMarketingHome from '@/components/LandingMarketingHome';

export default function Home() {
  return <LandingMarketingHome />;
}
```

- [ ] **Step 3: Verify build**

```bash
cd apps/web && pnpm typecheck && pnpm build
```

Expected: PASS, no behavior change yet.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/LandingMarketingHome.tsx apps/web/src/app/page.tsx
git commit -m "refactor(web): extract LandingMarketingHome component"
```

---

### Task 3: Command center component

**Files:**
- Create: `apps/web/src/components/LandingAuthedHome.tsx`
- Modify: `apps/web/src/app/globals.css` (minimal)

- [ ] **Step 1: Implement `LandingAuthedHome.tsx`**

```typescript
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import LandingMarketingHome from '@/components/LandingMarketingHome';

interface VaultRule {
  id: string;
  ruleType: string;
  enabled: boolean;
  config: { durationMinutes?: number };
}

type LoadState = 'loading' | 'authed' | 'fallback';

export default function LandingAuthedHome() {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [username, setUsername] = useState('');
  const [capMinutes, setCapMinutes] = useState<number | null>(null);
  const [vaultError, setVaultError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const meRes = await apiFetch('/auth/me');
      if (!meRes.ok) {
        if (!cancelled) setLoadState('fallback');
        return;
      }
      const meData = await meRes.json();
      if (!cancelled) {
        setUsername(meData.user?.username ?? 'Degen');
        setLoadState('authed');
      }

      const vaultRes = await apiFetch('/vault');
      if (!vaultRes.ok) {
        if (!cancelled) setVaultError(true);
        return;
      }
      const vaultData = await vaultRes.json();
      const cap = (vaultData.rules as VaultRule[] | undefined)?.find(
        (r) => r.ruleType === 'session_cap' && r.enabled,
      );
      if (!cancelled && cap?.config?.durationMinutes) {
        setCapMinutes(cap.config.durationMinutes);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadState === 'fallback') {
    return <LandingMarketingHome />;
  }

  const capArmed = capMinutes !== null;
  const lede = capArmed
    ? `${capMinutes}-minute Touch Grass cap is armed. Play smart or don't play.`
    : "Set your walk-away line. The extension can't enforce what you haven't configured.";

  const primaryHref = '/dashboard';
  const primaryLabel = capArmed ? 'OPEN DASHBOARD' : 'SET YOUR LINE';
  const secondaryHref = capArmed ? '/extension' : '/dashboard';
  const secondaryLabel = capArmed ? 'EXTENSION SETUP' : 'OPEN DASHBOARD';

  return (
    <main className="landing-page landing-authed-home">
      <section className="hero-surface">
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow">Welcome back</span>
          <h1 className="landing-hero-title landing-hero-title--centered landing-authed-home__title">
            {loadState === 'loading' ? 'Linking your session…' : `${username} — you're linked.`}
          </h1>
          {loadState === 'authed' ? (
            <p className="landing-hero-subtitle landing-hero-subtitle--centered landing-hero-subtitle--lede">
              {lede}
            </p>
          ) : null}

          <div className="hero-actions hero-actions--desktop hero-actions--mobile">
            <Link href={primaryHref} className="btn btn-primary">
              {loadState === 'loading' ? 'LOADING…' : primaryLabel}
            </Link>
            <Link href={secondaryHref} className="btn btn-ghost">
              {secondaryLabel}
            </Link>
          </div>

          {loadState === 'authed' ? (
            <div className="landing-authed-home__status public-page-grid public-page-grid--2">
              <article className="public-page-card">
                <p className="public-page-card__eyebrow">Vault</p>
                <h3 className="public-page-card__title">
                  {vaultError ? 'Status unavailable' : capArmed ? `Session cap: ${capMinutes} min` : 'No exit line set'}
                </h3>
                <p className="public-page-card__copy">
                  {vaultError ? (
                    <Link href="/dashboard">Open dashboard to check vault</Link>
                  ) : capArmed ? (
                    'Touch Grass lockout is configured.'
                  ) : (
                    <Link href="/dashboard">Set your session cap on the dashboard</Link>
                  )}
                </p>
              </article>
              <article className="public-page-card">
                <p className="public-page-card__eyebrow">Extension</p>
                <h3 className="public-page-card__title">Read-only watcher</h3>
                <p className="public-page-card__copy">
                  <Link href="/extension">Reload after login so vault rules sync</Link>
                </p>
              </article>
            </div>
          ) : null}

          <p className="landing-authed-home__tertiary">
            <Link href="/casinos">Casino trust</Link>
            {' · '}
            <Link href="/bonuses">Bonuses</Link>
            {' · '}
            <Link href="/settings">Settings</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Add minimal CSS**

```css
/* apps/web/src/app/globals.css — append near landing overrides */
.landing-authed-home__title {
  max-width: 22ch;
}

.landing-authed-home__status {
  margin-top: 2rem;
  width: min(100%, 40rem);
}

.landing-authed-home__tertiary {
  margin-top: 1.5rem;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9ca3af;
}

.landing-authed-home__tertiary a {
  color: #17c3b2;
  text-decoration: none;
}

.landing-authed-home__tertiary a:hover {
  text-decoration: underline;
}
```

Check `public-page-grid--2` exists; if not, use `public-page-grid` with two cards or add:

```css
.public-page-grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 640px) {
  .public-page-grid--2 {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/LandingAuthedHome.tsx apps/web/src/app/globals.css
git commit -m "feat(web): add authed landing command center component"
```

---

### Task 4: Server cookie branch on home page

**Files:**
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Wire server gate**

```typescript
// apps/web/src/app/page.tsx
import { cookies } from 'next/headers';
import LandingAuthedHome from '@/components/LandingAuthedHome';
import LandingMarketingHome from '@/components/LandingMarketingHome';
import { hasSessionCookie } from '@/lib/auth-redirect';

export default async function Home() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get('tc_session')?.value;

  if (hasSessionCookie(sessionValue)) {
    return <LandingAuthedHome />;
  }

  return <LandingMarketingHome />;
}
```

- [ ] **Step 2: Build**

```bash
cd apps/web && pnpm build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat(web): show command center home when session cookie present"
```

---

### Task 5: Nav reorder and conditional labels

**Files:**
- Modify: `apps/web/src/components/SiteNav.tsx`

- [ ] **Step 1: Add helpers at top of `SiteNav.tsx`**

```typescript
function filterQuickLinks(links: typeof NAV_QUICK_LINKS, authed: boolean) {
  if (!authed) return links;
  return links.filter((link) => link.href !== '/dashboard');
}

function mapMenuGroups(groups: typeof NAV_MENU_GROUPS, authed: boolean) {
  if (!authed) return groups;
  return groups.map((group) => {
    if (group.title !== 'Company') return group;
    return {
      ...group,
      links: group.links.map((link) =>
        link.href === '/' ? { ...link, label: 'Command center' } : link,
      ),
    };
  });
}
```

- [ ] **Step 2: Reorder hamburger JSX** (inside `nav-collapse-links`)

Replace block order with:

1. `{user ? (Account group) : null}`
2. Quick links group using `filterQuickLinks(NAV_QUICK_LINKS, Boolean(user))`
3. `{mapMenuGroups(NAV_MENU_GROUPS, Boolean(user)).map(...)}` (existing group render)
4. Remove the old Account group at the bottom

- [ ] **Step 3: Manual check**

```bash
cd apps/web && pnpm dev
```

Logged out: hamburger shows Quick links first, Company has "How it Works".  
Logged in: Account first, no Dashboard in Quick links, Company shows "Command center".

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/SiteNav.tsx
git commit -m "feat(web): prioritize Account nav and authed menu labels"
```

---

### Task 6: E2e regression + spec checklist

**Files:**
- Modify: `apps/web/e2e/logged-in-ia.spec.ts`
- Modify: `apps/web/e2e/smoke.spec.ts` (optional assertion)

- [ ] **Step 1: Add logged-out marketing assertions**

```typescript
test('logged-out home shows marketing hero', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /house always wins/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /install the extension/i }).first()).toBeVisible();
});
```

- [ ] **Step 2: Run full web e2e (skip Discord if unset)**

```bash
cd apps/web && pnpm test:e2e
```

Expected: All non-skipped tests PASS. Authed home content tests require real session — add optional test gated on `E2E_SESSION_COOKIE` env if you want CI coverage later.

- [ ] **Step 3: Run manual checklist from spec Section 8**

Walk items 1–10 on staging with a real Discord login.

- [ ] **Step 4: Commit**

```bash
git add apps/web/e2e/logged-in-ia.spec.ts
git commit -m "test(web): add logged-in IA e2e coverage"
```

---

## Plan self-review

| Spec section | Task |
|--------------|------|
| §2 Route matrix | Tasks 1, 4, 5 |
| §3 Command center | Tasks 2, 3, 4 |
| §4 Navigation | Task 5 |
| §5 Auth redirects | Task 1 |
| §7 Error handling | Task 3 (`fallback`, `vaultError`) |
| §8 Testing | Tasks 1, 6 |

No placeholders. `public-page-grid--2` called out with fallback CSS if missing.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-05-27-logged-in-ia.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — implement all tasks in this session with checkpoints

Which approach do you want?
