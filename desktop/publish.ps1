# Build a self-contained desktop package: API + Angular wwwroot + WPF shell
# Prerequisites: .NET 9 SDK, Node.js 22+
#
# Usage:
#   cd desktop
#   .\publish.ps1
#
# Output:
#   publish/desktop/AlHaram.Desktop.exe
#   publish/desktop/api/AlHaram.Api.exe
#   publish/desktop/api/wwwroot/

param(
    [string]$Configuration = "Release",
    [switch]$SelfContained
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$OutDir = Join-Path $Root "publish/desktop"
$ApiDir = Join-Path $OutDir "api"

Write-Host "`n=== Al-Haram POS Desktop publish ===" -ForegroundColor Cyan

Write-Host "[0/4] Generating app icon from logo..." -ForegroundColor Green
& (Join-Path $PSScriptRoot "make-icon.ps1")

Write-Host "[1/4] Building Angular (production)..." -ForegroundColor Green
Push-Location (Join-Path $Root "client")
if (-not (Test-Path "node_modules")) { npm ci }
$env:NODE_OPTIONS = "--max-old-space-size=8192"
# ng build emits warnings to stderr; don't let "Stop" treat those as fatal.
# Rely on the real exit code instead.
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
npx ng build --configuration production 2>&1 | Write-Host
$ngExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap
Pop-Location
if ($ngExit -ne 0) { throw "Angular build failed (exit $ngExit)." }

Write-Host "[2/4] Publishing API..." -ForegroundColor Green
if (Test-Path $OutDir) { Remove-Item $OutDir -Recurse -Force }
$publishArgs = @(
    "publish", (Join-Path $Root "src/AlHaram.Api/AlHaram.Api.csproj"),
    "-c", $Configuration,
    "-o", $ApiDir
)
if ($SelfContained) {
    $publishArgs += @("-r", "win-x64", "--self-contained", "true")
}
& dotnet @publishArgs

$WwwRoot = Join-Path $ApiDir "wwwroot"
New-Item -ItemType Directory -Force -Path $WwwRoot | Out-Null
Copy-Item -Path (Join-Path $Root "client/dist/client/browser/*") -Destination $WwwRoot -Recurse -Force

Write-Host "[3/4] Publishing desktop shell..." -ForegroundColor Green
$desktopArgs = @(
    "publish", (Join-Path $Root "desktop/AlHaram.Desktop/AlHaram.Desktop.csproj"),
    "-c", $Configuration,
    "-o", $OutDir
)
if ($SelfContained) {
    $desktopArgs += @("-r", "win-x64", "--self-contained", "true")
}
& dotnet @desktopArgs

Write-Host "[4/4] Copying desktop settings..." -ForegroundColor Green
Copy-Item -Path (Join-Path $Root "desktop/AlHaram.Desktop/appsettings.json") -Destination $OutDir -Force

Write-Host "`n=== Desktop package ready ===" -ForegroundColor Cyan
Write-Host "Run: $OutDir\AlHaram.Desktop.exe"
Write-Host ""
Write-Host "Requirements on target PC:" -ForegroundColor Yellow
Write-Host "  - Windows 10/11"
Write-Host "  - WebView2 Runtime (preinstalled on most Windows 11 PCs)"
Write-Host "  - SQL Server Express (SQLEXPRESS) or update appsettings.json"
Write-Host "  - .NET 9 runtime (unless you used -SelfContained)"
