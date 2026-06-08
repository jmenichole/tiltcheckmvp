# Wrapper called by Task Scheduler to run the email crawler.
# Log file: scripts\logs\email-crawler-YYYY-MM-DD.log

param(
    [int]$Limit = 500,
    [switch]$DryRun,
    [switch]$All,
    [switch]$KeepProcessed,
    [switch]$Digest
)

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $repoRoot

$logDir = Join-Path $repoRoot "scripts\logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir ("email-crawler-" + (Get-Date -Format "yyyy-MM-dd") + ".log")

function Write-Log {
    param([string]$Msg)
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $Msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

function Import-DotEnvFile {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $false }
    Get-Content $Path | Where-Object { $_ -match '^[A-Z_]+=.+' -and $_ -notmatch '^#' } | ForEach-Object {
        $parts = $_ -split '=', 2
        $key = $parts[0].Trim()
        $val = $parts[1].Trim().Trim('"')
        [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
    }
    return $true
}

Write-Log "=== Email Crawler Start ==="
Write-Log "Repo root: $repoRoot"

$envFile = Join-Path $repoRoot ".env"
$fallbackCandidates = @(
    (Join-Path $env:USERPROFILE "tiltcheck-monorepo\.env"),
    (Join-Path (Split-Path $repoRoot -Parent) "tiltcheck-monorepo\.env")
)
$loaded = Import-DotEnvFile -Path $envFile
if (-not $loaded) {
    foreach ($candidate in $fallbackCandidates) {
        if (Import-DotEnvFile -Path $candidate) {
            Write-Log "Loaded crawler env from $candidate"
            $loaded = $true
            break
        }
    }
    if (-not $loaded) {
        Write-Log "WARNING: No .env found in v2 repo or monorepo fallback paths"
    }
} else {
    Write-Log ".env loaded"
}

if (-not $env:CRAWLER_API_URL) {
    $env:CRAWLER_API_URL = "https://tiltcheck-api-production.up.railway.app"
    Write-Log "CRAWLER_API_URL default: $($env:CRAWLER_API_URL)"
}

$requiredVars = @("CRAWLER_EMAIL", "CRAWLER_APP_PASSWORD")
$missing = $requiredVars | Where-Object { -not [System.Environment]::GetEnvironmentVariable($_) }
if ($missing.Count -gt 0) {
    Write-Log "ERROR: Missing env vars: $($missing -join ', '). Check your .env file."
    exit 1
}
Write-Log "Crawler account: $([System.Environment]::GetEnvironmentVariable('CRAWLER_EMAIL'))"

$tsxLocal = Join-Path $repoRoot "node_modules\.bin\tsx.cmd"
$tsxPath = if (Test-Path $tsxLocal) { $tsxLocal } else {
    $globalCommand = Get-Command tsx -ErrorAction SilentlyContinue
    if (-not $globalCommand) {
        Write-Log "ERROR: tsx not found. Run 'pnpm install' in $repoRoot first."
        exit 1
    }
    $globalCommand.Source
}
Write-Log "tsx: $tsxPath"

$crawlerScript = Join-Path $repoRoot "scripts\email-crawler.ts"
$args = @($crawlerScript, "--limit", $Limit)
if ($DryRun) { $args += "--dry-run" }
if ($All) { $args += "--all" }
if ($KeepProcessed) { $args += "--keep-processed" }
if ($Digest) { $args += "--digest" }
Write-Log "Running: tsx $($args -join ' ') (delete after ingest: $(-not $KeepProcessed -and -not $DryRun))"

& $tsxPath @args 2>&1 | ForEach-Object {
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $_"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

$exitCode = $LASTEXITCODE
Write-Log "=== Email Crawler End (exit: $exitCode) ==="
Write-Log "Full log: $logFile"
exit $exitCode
