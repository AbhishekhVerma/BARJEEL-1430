<#
.SYNOPSIS
    Mission BARJEEL-1430 (برجيل-1430) — Unified Windows PowerShell Launcher.
#>

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "   MISSION BARJEEL-1430 (برجيل-1430) — UNIFIED LAUNCHER" -ForegroundColor Cyan
Write-Host "   Theme 02: Cities from Orbit | Dubai South & Expo City Twin" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptRoot "backend"
$frontendDir = Join-Path $scriptRoot "frontend"
$venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Warning "backend/.venv not found, falling back to system python"
    $pythonCmd = "python"
} else {
    $pythonCmd = $venvPython
}

Write-Host "[1/2] Launching Orbital Edge AI Backend (port 8000)..." -ForegroundColor Yellow
$backendProc = Start-Process -FilePath $pythonCmd -ArgumentList "server.py" -WorkingDirectory $backendDir -PassThru

Write-Host "[2/2] Launching 3D Digital Twin Frontend (port 5173)..." -ForegroundColor Yellow
$frontendProc = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $frontendDir -PassThru

Write-Host "`n------------------------------------------------------------------------" -ForegroundColor Green
Write-Host "   SERVICES ONLINE:" -ForegroundColor Green
Write-Host "   - 3D Digital Twin & Mission Control : http://localhost:5173" -ForegroundColor White
Write-Host "   - Edge AI REST & Swagger Docs      : http://localhost:8000/docs" -ForegroundColor White
Write-Host "   - CCSDS 133.0-B-2 Telemetry Stream : ws://localhost:8000/ws/telemetry" -ForegroundColor White
Write-Host "------------------------------------------------------------------------" -ForegroundColor Green
Write-Host "   Press any key to stop all services...`n" -ForegroundColor DarkGray

[void][System.Console]::ReadKey($true)

Write-Host "`n[*] Stopping services..." -ForegroundColor Yellow
Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue
Write-Host "[+] Mission BARJEEL-1430 shut down cleanly." -ForegroundColor Green
