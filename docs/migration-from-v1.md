# Migration from tiltcheck-monorepo (v1)

| v1 path | v2 path |
|---------|---------|
| `apps/web` (marketing) | `apps/web` |
| `apps/user-dashboard` | `apps/web/src/app/(app)/dashboard` |
| `apps/api` | `apps/api` (Hono, slim routes) |
| `apps/chrome-extension` | `apps/extension` |
| `apps/web/src/lib/casino-trust.ts` | `packages/trust` |
| `@tiltcheck/db` (v1 packages) | `packages/db` + `supabase/migrations` |
| `dashboard.tiltcheck.me` | `tiltcheck.me/dashboard` |

## Routes kept (MVP)

- `/`, `/extension`, `/casinos`, `/casinos/[slug]`
- `/login`, `/dashboard`
- `/privacy`, `/terms`, `/legal`
- `/tools/domain-verifier`, `/tools/scan-scams`

## Deferred from v1

Operators portal, blog, game-arena, Stripe, wallet stack, trust-rollup service, 40+ packages.
