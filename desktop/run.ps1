# Run Al-Haram POS desktop (closes stale API on desktop ports first)
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$DesktopExe = Join-Path $Root "publish/desktop/AlHaram.Desktop.exe"

if (-not (Test-Path $DesktopExe)) {
    Write-Host "Desktop package not found. Building..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "publish.ps1")
}

foreach ($port in 5227, 5228, 5229, 5230) {
    Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        ForEach-Object {
            $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
            if ($p -and ($p.ProcessName -in @('AlHaram.Api', 'dotnet'))) {
                Write-Host "Stopping $($p.ProcessName) (PID $($p.Id)) on port $port..."
                Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
            }
        }
}

Start-Sleep -Seconds 1
Start-Process $DesktopExe
