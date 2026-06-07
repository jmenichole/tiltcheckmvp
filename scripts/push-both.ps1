# Push to origin/main (Railway auto-deploy) and mirror to origin/master.
# Run from repo root on branch main after commit.

param()

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "main") {
  Write-Error "Switch to main first: git branch -M main"
}

git push origin main
git push origin main:master
Write-Host "Pushed to origin/main and origin/master." -ForegroundColor Green
