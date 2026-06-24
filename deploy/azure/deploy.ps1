# Deploy Al-Haram POS to Azure (App Service F1 free + Azure SQL Basic)
# Prerequisites: az login, dotnet 9 SDK, Node.js 22+
#
# Usage:
#   cd deploy/azure
#   .\deploy.ps1
#
# Optional parameters:
#   .\deploy.ps1 -ResourceGroup "alharam-demo-rg" -Location "westeurope" -AppName "alharam-pos-demo-12345"

param(
    [string]$ResourceGroup = "alharam-pos-rg",
    [string]$Location = "westeurope",
    [string]$AppName = "",
    [string]$SqlAdminUser = "sqladmin"
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "../..")

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI (az) is not installed. Install from https://learn.microsoft.com/cli/azure/install-azure-cli"
}

$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in to Azure. Running: az login" -ForegroundColor Yellow
    az login | Out-Null
}

if ([string]::IsNullOrWhiteSpace($AppName)) {
    $suffix = Get-Random -Minimum 10000 -Maximum 99999
    $AppName = "alharam-pos-$suffix"
}

$SqlServerName = "$AppName-sql".ToLower() -replace '[^a-z0-9-]', ''
if ($SqlServerName.Length -gt 60) { $SqlServerName = $SqlServerName.Substring(0, 60) }

$SqlDbName = "AlHaramDb"
$PlanName = "$AppName-plan"
$SqlPassword = [Convert]::ToBase64String((1..24 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]]) -replace '[^a-zA-Z0-9]', 'x'
$JwtSecret = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])

Write-Host "`n=== Al-Haram POS — Azure deployment ===" -ForegroundColor Cyan
Write-Host "Resource group : $ResourceGroup"
Write-Host "Location       : $Location"
Write-Host "App name       : $AppName"
Write-Host "SQL server     : $SqlServerName"
Write-Host "Subscription   : $($account.name)"
Write-Host ""

$confirm = Read-Host "Create/update Azure resources and deploy? (y/N)"
if ($confirm -notmatch '^[yY]') { Write-Host "Cancelled."; exit 0 }

Write-Host "`n[1/8] Creating resource group..." -ForegroundColor Green
az group create --name $ResourceGroup --location $Location --output none

Write-Host "[2/8] Creating SQL server + database (Basic tier ~`$5/mo)..." -ForegroundColor Green
az sql server create `
    --resource-group $ResourceGroup `
    --name $SqlServerName `
    --location $Location `
    --admin-user $SqlAdminUser `
    --admin-password $SqlPassword `
    --output none

az sql server firewall-rule create `
    --resource-group $ResourceGroup `
    --server $SqlServerName `
    --name AllowAzure `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0 `
    --output none

az sql db create `
    --resource-group $ResourceGroup `
    --server $SqlServerName `
    --name $SqlDbName `
    --edition Basic `
    --capacity 5 `
    --output none

Write-Host "[3/8] Creating App Service plan (F1 Free)..." -ForegroundColor Green
az appservice plan create `
    --resource-group $ResourceGroup `
    --name $PlanName `
    --location $Location `
    --sku F1 `
    --is-linux `
    --output none

Write-Host "[4/8] Creating Web App (.NET 9)..." -ForegroundColor Green
az webapp create `
    --resource-group $ResourceGroup `
    --plan $PlanName `
    --name $AppName `
    --runtime "DOTNETCORE:9.0" `
    --output none

$AppUrl = "https://$AppName.azurewebsites.net"
$ConnStr = "Server=tcp:$SqlServerName.database.windows.net,1433;Initial Catalog=$SqlDbName;Persist Security Info=False;User ID=$SqlAdminUser;Password=$SqlPassword;MultipleActiveResultSets=True;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

Write-Host "[5/8] Configuring app settings..." -ForegroundColor Green
az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $AppName `
    --settings `
        ASPNETCORE_ENVIRONMENT=Production `
        Jwt__Secret=$JwtSecret `
        Jwt__Issuer=AlHaram `
        Jwt__Audience=AlHaramClient `
        Storage__RootPath=/home/site/data `
    --output none

az webapp config connection-string set `
    --resource-group $ResourceGroup `
    --name $AppName `
    --connection-string-type SQLServer `
    --settings DefaultConnection=$ConnStr `
    --output none

Write-Host "[6/8] Building Angular client..." -ForegroundColor Green
Push-Location (Join-Path $Root "client")
if (-not (Test-Path "node_modules")) { npm ci }
$env:NODE_OPTIONS = "--max-old-space-size=8192"
npm run build -- --configuration production
Pop-Location

Write-Host "[7/8] Publishing API + wwwroot..." -ForegroundColor Green
$PublishDir = Join-Path $Root "publish/azure"
if (Test-Path $PublishDir) { Remove-Item $PublishDir -Recurse -Force }
dotnet publish (Join-Path $Root "src/AlHaram.Api/AlHaram.Api.csproj") -c Release -o $PublishDir

$WwwRoot = Join-Path $PublishDir "wwwroot"
New-Item -ItemType Directory -Force -Path $WwwRoot | Out-Null
Copy-Item -Path (Join-Path $Root "client/dist/client/browser/*") -Destination $WwwRoot -Recurse -Force

Write-Host "[8/8] Deploying to Azure..." -ForegroundColor Green
$ZipPath = Join-Path $Root "publish/azure-deploy.zip"
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path "$PublishDir/*" -DestinationPath $ZipPath -Force

az webapp deploy `
    --resource-group $ResourceGroup `
    --name $AppName `
    --src-path $ZipPath `
    --type zip `
    --async false `
    --timeout 600000 `
    --output none

$SecretsFile = Join-Path $Root "deploy/azure/.deployment-secrets.local.json"
@{
    deployedAt = (Get-Date).ToString("o")
    resourceGroup = $ResourceGroup
    appName = $AppName
    appUrl = $AppUrl
    sqlServer = $SqlServerName
    sqlDatabase = $SqlDbName
    sqlAdminUser = $SqlAdminUser
    sqlAdminPassword = $SqlPassword
    jwtSecret = $JwtSecret
} | ConvertTo-Json | Set-Content $SecretsFile -Encoding UTF8

Write-Host "`n=== Deployment complete ===" -ForegroundColor Cyan
Write-Host "App URL    : $AppUrl"
Write-Host "Login      : admin / Admin@123"
Write-Host "Secrets    : $SecretsFile  (DO NOT commit to git)"
Write-Host ""
Write-Host "First startup may take 1-2 minutes (database migration)." -ForegroundColor Yellow
Write-Host "Free F1 tier: app may sleep when idle; first visit can be slow." -ForegroundColor Yellow
