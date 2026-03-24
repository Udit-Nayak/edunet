param(
    [switch]$Fix,
    [switch]$SkipMl
)

$ErrorActionPreference = 'Stop'

function Write-Section {
    param([string]$Text)
    Write-Host ''
    Write-Host ('=' * 72) -ForegroundColor Cyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host ('=' * 72) -ForegroundColor Cyan
}

function Run-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    Write-Host "-> $Name" -ForegroundColor Yellow
    try {
        & $Action
        Write-Host "   PASS" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "   FAIL: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$allPassed = $true

Write-Section "EduNet Lint Runner"
Write-Host "Repository: $repoRoot"
Write-Host "Fix mode: $Fix"
Write-Host "Skip ML checks: $SkipMl"

# Client lint
$clientPath = Join-Path $repoRoot 'client'
if (Test-Path $clientPath) {
    $allPassed = (Run-Step "Client lint" {
        Push-Location $clientPath
        if ($Fix) {
            npm run lint -- --fix
        }
        else {
            npm run lint
        }
        Pop-Location
    }) -and $allPassed
}

# Server lint
$serverPath = Join-Path $repoRoot 'server'
if (Test-Path $serverPath) {
    $allPassed = (Run-Step "Server lint" {
        Push-Location $serverPath
        if ($Fix) {
            npm run lint:fix
        }
        else {
            npm run lint
        }
        Pop-Location
    }) -and $allPassed
}

# ML service checks
if (-not $SkipMl) {
    $mlPath = Join-Path $repoRoot 'ml-service'
    if (Test-Path $mlPath) {
        $allPassed = (Run-Step "ML service checks (ruff + compileall)" {
            Push-Location $mlPath

            $py = if (Test-Path '.\venv\Scripts\python.exe') {
                '.\venv\Scripts\python.exe'
            }
            else {
                'python'
            }

            if (Test-Path '.\requirements-dev.txt') {
                & $py -m pip install -r requirements-dev.txt
            }

            if ($Fix) {
                & $py -m ruff check . --fix
            }
            else {
                & $py -m ruff check .
            }

            & $py -m compileall app
            Pop-Location
        }) -and $allPassed
    }
}

Write-Section "Summary"
if ($allPassed) {
    Write-Host 'All lint checks passed.' -ForegroundColor Green
    exit 0
}
else {
    Write-Host 'One or more lint checks failed. See output above.' -ForegroundColor Red
    exit 1
}
