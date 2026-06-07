# Registers a Windows Task Scheduler job for the v2 email crawler.
#
# Usage:
#   ./scripts/register-email-crawler-task.ps1
#   ./scripts/register-email-crawler-task.ps1 -Schedule Daily -Times 07:00,19:00

param(
    [string]$TaskName = "TiltCheck-v2-EmailCrawler",
    [ValidateSet("Daily", "Weekly")]
    [string]$Schedule = "Daily",
    [string[]]$Days = @("Monday", "Wednesday", "Friday"),
    [string[]]$Times = @("07:00", "19:00"),
    [int]$Limit = 200,
    [switch]$DryRun,
    [switch]$DeleteProcessed,
    [switch]$DisableAfterCreate
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent

$tsxPath = Join-Path $repoRoot "node_modules\.bin\tsx.cmd"
if (-not (Test-Path $tsxPath)) {
    $tsxCommand = Get-Command tsx -ErrorAction SilentlyContinue
    if (-not $tsxCommand) {
        throw "tsx not found. Run 'pnpm install' in the repo root first."
    }
}

$runnerScript = Join-Path $repoRoot "scripts\run-email-crawler.ps1"
if (-not (Test-Path $runnerScript)) {
    throw "scripts/run-email-crawler.ps1 not found at $runnerScript"
}

$envFile = Join-Path $repoRoot ".env"
$fallbackCandidates = @(
    (Join-Path $env:USERPROFILE "tiltcheck-monorepo\.env"),
    (Join-Path (Split-Path $repoRoot -Parent) "tiltcheck-monorepo\.env")
)
$hasEnv = Test-Path $envFile
if (-not $hasEnv) {
    foreach ($candidate in $fallbackCandidates) {
        if (Test-Path $candidate) {
            $hasEnv = $true
            break
        }
    }
}
if (-not $hasEnv) {
    throw "No .env in v2 repo and no tiltcheck-monorepo/.env fallback. Add CRAWLER_EMAIL / CRAWLER_APP_PASSWORD."
}

function ConvertTo-TriggerTime {
    param([string]$Text)
    try {
        return [DateTime]::ParseExact($Text, "HH:mm", [System.Globalization.CultureInfo]::InvariantCulture)
    } catch {
        throw "Invalid time '$Text'. Use 24-hour format HH:mm (e.g. 07:00)."
    }
}

$validDays = @("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
if ($Schedule -eq "Weekly") {
    foreach ($day in $Days) {
        if ($validDays -notcontains $day) {
            throw "Invalid day '$day'. Valid values: $($validDays -join ', ')"
        }
    }
}

$triggers = @()
foreach ($timeText in $Times) {
    $time = ConvertTo-TriggerTime -Text $timeText
    if ($Schedule -eq "Daily") {
        $triggers += New-ScheduledTaskTrigger -Daily -At $time
    } else {
        $triggers += New-ScheduledTaskTrigger -Weekly -DaysOfWeek $Days -At $time
    }
}

$argList = "-NoProfile -ExecutionPolicy Bypass -File `"$runnerScript`" -Limit $Limit -Digest"
if ($DryRun) { $argList += " -DryRun" }
if ($DeleteProcessed) { $argList += " -DeleteProcessed" }

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument $argList `
    -WorkingDirectory $repoRoot

$principal = New-ScheduledTaskPrincipal `
    -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType Interactive `
    -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -MultipleInstances IgnoreNew

Write-Host "Registering scheduled task '$TaskName'..."
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $triggers `
    -Principal $principal `
    -Settings $settings `
    -Description "Crawls casino marketing email into TiltCheck v2 bonus feed (staging API)." `
    -Force | Out-Null

if ($DisableAfterCreate) {
    Disable-ScheduledTask -TaskName $TaskName | Out-Null
    Write-Host "Task created (disabled - enable it when ready)."
} else {
    Write-Host "Task created and enabled."
}

Write-Host ""
Write-Host "Task name  : $TaskName"
Write-Host "Schedule   : $Schedule at $($Times -join ', ')"
Write-Host "Limit/run  : $Limit emails"
Write-Host "Run now    : Start-ScheduledTask -TaskName `"$TaskName`""
