# Build TiltCheck extension. Defaults to production API/web URLs.
# Local API dev:
#   $env:EXTENSION_API_URL = "http://localhost:3001"
#   $env:EXTENSION_WEB_URL = "http://localhost:3000"
#   .\scripts\build-extension.ps1

param()

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not $env:EXTENSION_API_URL) {
  $env:EXTENSION_API_URL = "https://tiltcheck-api-production.up.railway.app"
}
if (-not $env:EXTENSION_WEB_URL) {
  $env:EXTENSION_WEB_URL = "https://tiltcheckmvp-production.up.railway.app"
}

Write-Host "EXTENSION_API_URL=$($env:EXTENSION_API_URL)" -ForegroundColor Cyan
Write-Host "EXTENSION_WEB_URL=$($env:EXTENSION_WEB_URL)" -ForegroundColor Cyan

pnpm --filter @tiltcheck/extension build
Write-Host "Reload the unpacked extension from apps/extension/dist in chrome://extensions" -ForegroundColor Green
