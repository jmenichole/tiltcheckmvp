# Site IA, Bonuses Feed & Tools Nav (Design Spec)

**Date:** 2026-05-28  
**Status:** Approved — build after Track 1 (game exclusion A–E)  
**Related:** [2026-05-28-tilt-sensitivity-game-exclusion-design.md](./2026-05-28-tilt-sensitivity-game-exclusion-design.md)

---

## 1. Problem

Navigation duplicates labels and points at wrong or unbuilt tools. Bonuses page shows repetitive thin cards when feed is static or deduped poorly. Header lacks a single install entry point.

---

## 2. Nav model (Approach A — approved)

### Header

- Add **install/download icon button** → Chrome Web Store URL (or `/extension` until listed).
- Remove extension from hamburger quick links.

### Quick links (hamburger top)

- Casino Trust → `/casinos`
- Bonuses → `/bonuses`
- Dashboard → `/dashboard` (Account block when authed; dedupe)

### Tools group

| Label | Route | Notes |
|-------|-------|-------|
| Stake Auto-Vault | `/stake` | Rename from "Profit Guardrails" |
| nuts.gg Auto-Vault | `/nuts` | **Add** — page exists |
| Promo Link Checker | `/tools/domain-verifier` | Rename from "Bet Verifier" |
| Scam Registry | `/tools/scan-scams` | Keep |

### Remove from nav (until P4 built)

- House Edge Scanner (was → `/casinos`)
- RTP Drift Watch (was → `/dashboard`)
- All duplicate Extension / Casino Trust Scores / Daily Bonus Tracker entries
- Intel group merged into quick links + tools

---

## 3. Bonuses feed (Phase G)

1. **Dedup** API response by normalized `casinoName + offerTitle` (keep newest `verified`).
2. **Empty state** when no inbox data — do not show 3 identical-looking static cards without banner.
3. **Static fallback** — max 3 distinct examples + prominent `STATIC EXAMPLES` banner.
4. **Card fields** — always show offer title, code if any, expiry/urgency, last verified, source chip.

---

## 4. Tool copy honesty

- Domain verifier page title: **Promo Link Checker** — heuristic typosquat/blacklist, not bet HMAC verify (P4).
- Stake/nuts pages: eyebrow **Auto-Vault userscript** — Android Firefox/Edge.

---

## Spec self-review

- [x] Dedupes user-reported nav issues
- [x] Does not claim unbuilt P4 tools as live
