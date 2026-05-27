# Deploy

## Web (Vercel)

1. Import `apps/web` as root directory (or monorepo with root `apps/web`).
2. Set env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEB_URL`.
3. Build command: `cd ../.. && pnpm install && pnpm --filter @tiltcheck/web build`.

## API (Railway)

1. Service root: `apps/api`.
2. Start: `node dist/index.js` after `pnpm build`.
3. Env: `DISCORD_*`, `SUPABASE_*`, `SESSION_SECRET`, `WEB_URL`, `API_URL`.

## Extension

1. `pnpm --filter @tiltcheck/extension build`
2. Zip `apps/extension/dist` for Chrome Web Store.
3. Point `apiUrl` in extension storage to production API.

## Supabase

Run migrations in `supabase/migrations` against the target project.
