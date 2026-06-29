# Builds the distributable Windows installer (AlHaram-POS-Setup.exe).
#
# Steps:
#   1. Publishes the desktop app self-contained (bundles the .NET 9 runtime,
#      so client PCs do NOT need .NET installed).
#   2. Compiles the Inno Setup script into a single installer .exe.
#
# Prerequisites on THIS (build) machine:
#   - .NET 9 SDK, Node.js 22+
#   - Inno Setup 6  (https://jrsoftware.org/isdl.php)  -> provides ISCC.exe
#
# Usage:
#   cd desktop
#   .\build-installer.ps1

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "`n=== Building Al-Haram POS installer ===" -ForegroundColor Cyan

# 1. Self-contained publish (no .NET needed on client).
& (Join-Path $PSScriptRoot "publish.ps1") -SelfContained

# 2. Locate the Inno Setup compiler.
$iscc = (Get-Command iscc -ErrorAction SilentlyContinue).Source
if (-not $iscc) {
    foreach ($p in @(
        "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
        "C:\Program Files\Inno Setup 6\ISCC.exe",
        "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe")) {
        if (Test-Path $p) { $iscc = $p; break }
    }
}

if (-not $iscc) {
    Write-Host "`nInno Setup (ISCC.exe) was not found." -ForegroundColor Yellow
    Write-Host "Install it once, then re-run this script:" -ForegroundColor Yellow
    Write-Host "  winget install JRSoftware.InnoSetup" -ForegroundColor White
    Write-Host "  (or download from https://jrsoftware.org/isdl.php)" -ForegroundColor White
    Write-Host "`nThe self-contained app is ready at: $Root\publish\desktop" -ForegroundColor Green
    exit 1
}

$iss = Join-Path $PSScriptRoot "installer/AlHaram-Setup.iss"
Write-Host "`nCompiling installer with: $iscc" -ForegroundColor Green
& $iscc $iss

$out = Join-Path $Root "publish/installer/AlHaram-POS-Setup.exe"
if (Test-Path $out) {
    Write-Host "`n=== Installer ready ===" -ForegroundColor Cyan
    Write-Host "File: $out"
    Write-Host "Give this single file to the client to install Al-Haram POS."
}
