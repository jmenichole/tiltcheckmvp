# Live License Check (Design Spec)

**Date:** 2026-05-28  
**Status:** Approved — P3 implementation (post Phase 2 cutover)  
**Phase:** P3 per [phases.md](../../phases.md) item 12  
**Related:** [packages/trust](../../packages/trust), casino directory UI

---

## 1. Problem & goal

**Problem:** Trust scores show free-text license strings on detail pages only. Users cannot see at a glance whether a license is **valid right now**, and directory cards omit license entirely.

**Goal:** `GET /rgaas/license-check?domain=…` returns structured license data with a **live validity status**, cached in Supabase and refreshed on a schedule.

**User-facing outcome:** Every trust score (directory card + detail) shows **license authority/number** (when known) and badge: **Valid** / **Expired** / **Unverified** / **Unlicensed** / **Sweepstakes**.

---

## 2. API contract

### `GET /rgaas/license-check`

| Param | Required | Description |
|-------|----------|-------------|
| `domain` | yes | Casino site hostname, e.g. `stake.com` |
| `refresh` | no | `1` forces bypass cache (rate-limited) |

**Response 200:**

```json
{
  "success": true,
  "domain": "stake.com",
  "source": "registry|static|cache",
  "checkedAt": "2026-05-28T12:00:00Z",
  "expiresAt": "2026-06-28T12:00:00Z",
  "license": {
    "authority": "Curaçao eGaming",
    "number": "8048/JAZ",
    "jurisdiction": "CW",
    "status": "valid|expired|revoked|unknown|unlicensed|sweepstakes"
  },
  "displayLabel": "Curaçao 8048/JAZ",
  "validNow": true
}
```

**404:** domain not in catalog and no registry match.

### Integration with `GET /rgaas/casino-scores`

Extend live score rows (or join client-side) with optional `licenseSummary` from cache table for directory cards.

---

## 3. Data model (Supabase)

```sql
create table if not exists license_checks (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  casino_name text,
  authority text,
  license_number text,
  jurisdiction text,
  status text not null check (status in ('valid','expired','revoked','unknown','unlicensed','sweepstakes')),
  valid_now boolean not null default false,
  raw_response jsonb,
  checked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists license_checks_expires_at_idx on license_checks(expires_at);
```

**TTL:** 7 days for `valid`; 24h for `unknown`/`revoked`; 30 days for static sweepstakes/unlicensed from trust catalog.

---

## 4. Verification strategy (phased)

| Tier | Jurisdiction / type | Method |
|------|---------------------|--------|
| **1** | UKGC, MGA, NJ DGE, PA PGCB | Public register scrape or published API where available |
| **2** | Curaçao, Kahnawake, Gibraltar | Registry lookup by license number from site footer |
| **3** | Sweepstakes / unlicensed | Static from `packages/trust` `CASINO_META` — no live check |
| **4** | Unknown domain | `status: unknown`, re-check in 24h |

**Worker:** Railway cron or local script `pnpm license:refresh` batching stale rows.

**False positives:** Never mark `valid` without registry confirmation; default to `unknown` when ambiguous.

---

## 5. Web UI

| Surface | Change |
|---------|--------|
| `/casinos` cards | License line + status badge under grade |
| `/casinos/[slug]` | Structured license block: authority, number, `validNow`, last checked |
| Static fallback | When API down, show `CASINO_META.license` text + `STATIC` badge |

---

## 6. Testing

- Unit: domain normalize, cache TTL, status enum mapping
- Integration: mock registry responses
- Manual: Stake (Curaçao), DraftKings (NJ), Chumba (sweepstakes), SlotsOfVegas (unlicensed)

---

## 7. Non-goals

- Real-time operator API partnerships
- Legal certification or gambling advice
- Blocking users from unlicensed sites (intel only)
