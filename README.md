# TiltCheck MVP 

A slimmed-down, hyper-focused monorepo for the absolute core TiltCheck loop: proving casino trust, protecting user sessions, and enforcing durable bankroll rules. 

> **CRITICAL AGENT RULE:** We are strictly building a Lean MVP. 
> - Never add extra dependencies, unused files, or future-proofed boilerplate.
> - Always suggest the absolute simplest, most direct code solutions.
> - If a feature is not explicitly listed in the Phase 1/2 gates below, do not write code for it.
> - Never use emojis.
> - **TONE:** Copy, comments, error messages, and UI text must be direct and sharp. No fluff, no apologies. Humor, dry wit, sarcasm, and millennial slang are not just allowed — they are part of the brand. The voice is a sharp friend who genuinely gives a damn: honest about bad decisions, funny about it, never cruel, always in your corner.
> - Voice pillars:
Humor and wit — dry, deadpan, never try-hard. Funny because it's true, not because it's trying.
Sarcasm — pointed but not mean. "Oh cool, another loss. Very normal behavior."
Millennial slang — use naturally, not forced. "no cap" (cap = a lie, no cap = facts/truth), "lowkey", "big yikes", "it's giving", "we see you", "cooked", "locked in", "the math is mathing", "touch grass"
> - **NO EMOJIS:** Absolutely no emojis allowed in source code, comments, commit messages, or UI text. Emojis are restricted to markdown files only.
> - **COPYRIGHT:** Every new or modified source file must include the mandatory copyright header: `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: [YYYY-MM-DD]`.
> - **NON-CUSTODIAL:** Never write code or schemas that store private keys, seeds, or hold user funds. Pass-through or client-side signing only.

---

##  The Core Architecture

To prevent over-engineering, the ecosystem is limited to these exact surfaces:

* **`apps/web` (Next.js):** Out-of-the-box marketing page, simple Discord authentication, and a basic user profile layout.
* **`apps/api` (Hono):** Lightweight API handling authentication routing, basic trust score calculations, and vault data storage.
* **`apps/extension` (Chrome MV3):** A straightforward browser sidebar to detect active sessions and display real-time safety warnings.
* **`apps/discord` (Scaffold):** A minimal bot shell reserved purely for real-time risk alerts and session summaries.

---

##  MVP Feature Scope & Ship Gates

### Phase 1 — Groundwork & Deployment (Current Focus)
* [ ] Fix root configuration matrices (`package.json`, `pnpm-workspace.yaml`, `turbo.json`).
* [ ] Ensure `apps/web` and `apps/api` pass local builds (`pnpm build`).
* [ ] Resolve Railway deployment configurations so the root build connects cleanly.

### Phase 2 — The North-Star Loop
* [ ] **Trust Proof:** Public casino search page on the web app.
* [ ] **Session Loop:** Chrome extension reads a casino domain, hits the Hono API, and displays a safety score.
* [ ] **Durable Controls:** A basic "Vault" tab in the web dashboard allowing users to log profile settings.

---

##  Quick Start for Humans & Agents

```bash
# 1. Install dependencies cleanly
pnpm install

# 2. Test local builds
pnpm build

# 3. Spin up individual development workspaces
pnpm --filter @tiltcheck/api dev
pnpm --filter @tiltcheck/web dev
