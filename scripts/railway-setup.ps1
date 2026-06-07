# TiltCheck v2 — Railway CLI setup (run from repo root)
# Requires: railway CLI (npm i -g @railway/cli), GitHub repo pushed to main

param(
  [string]$ProjectName = "tiltcheckmvp"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "=== Railway login (browser) ===" -ForegroundColor Cyan
railway login

Write-Host "`n=== Link project (pick $ProjectName if prompted) ===" -ForegroundColor Cyan
railway link

Write-Host @"

=== Create two services (if new project) ===
Run once per service, or create in dashboard and link:

  railway add --service tiltcheck-api --repo jmenichole/tiltcheckmvp
  railway add --service tiltcheck-web --repo jmenichole/tiltcheckmvp

=== Dashboard step (required once per service) ===
Service → Settings → Config-as-code → Config file path:
  API: /apps/api/railway.toml
  Web: /apps/web/railway.toml

Remove any custom Start Command like 'node health-server.js' in dashboard
(railway.toml overrides when config path is set).

=== Set API env vars (example — edit values) ===
"@ -ForegroundColor Yellow

$apiVars = @(
  'WEB_URL=https://YOUR-WEB.up.railway.app',
  'API_URL=https://YOUR-API.up.railway.app',
  'SESSION_SECRET=CHANGE_ME_MIN_32_CHARS',
  'DISCORD_CLIENT_ID=',
  'DISCORD_CLIENT_SECRET=',
  'DISCORD_REDIRECT_URI_WEB=https://YOUR-API.up.railway.app/auth/discord/callback',
  'SUPABASE_URL=',
  'SUPABASE_SERVICE_ROLE_KEY='
)

Write-Host "  railway link -s tiltcheck-api" -ForegroundColor Gray
foreach ($v in $apiVars) {
  Write-Host "  railway variable set $v -s tiltcheck-api" -ForegroundColor Gray
}

Write-Host @"

=== Set Web env vars (example) ===
  railway link -s tiltcheck-web
  railway variable set NEXT_PUBLIC_WEB_URL=https://YOUR-WEB.up.railway.app -s tiltcheck-web
  railway variable set NEXT_PUBLIC_API_URL=https://YOUR-API.up.railway.app -s tiltcheck-web
  railway variable set NEXT_PUBLIC_SHOW_TOOLS_NAV=false -s tiltcheck-web
  railway variable set BONUSES_UPSTREAM_URL=https://api.tiltcheck.me/bonuses -s tiltcheck-web

=== Deploy ===
  railway up -s tiltcheck-api
  railway up -s tiltcheck-web

=== Domains ===
  railway domain -s tiltcheck-api
  railway domain -s tiltcheck-web

=== Logs ===
  railway logs -s tiltcheck-api
  railway logs -s tiltcheck-web

Start commands (from railway.toml):
  API: pnpm --filter @tiltcheck/api start
  Web: pnpm --filter @tiltcheck/web start
"@ -ForegroundColor Green
