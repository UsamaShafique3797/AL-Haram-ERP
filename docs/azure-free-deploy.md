# Deploy Al-Haram POS on Azure (Free / Trial)

This guide deploys the ERP as **one website** on Azure:

- **Angular UI + .NET API** → Azure App Service **F1 (Free)**
- **SQL Server database** → Azure SQL **Basic** (~$5/month; often covered by free trial credits)

After deployment your client opens a single URL, e.g. `https://alharam-pos-12345.azurewebsites.net`.

Default login: **admin** / **Admin@123**

---

## What you need

| Requirement | Notes |
|-------------|--------|
| Azure account | [Create free account](https://azure.microsoft.com/free) — $200 credit + 12 months free services |
| Azure CLI | `winget install Microsoft.AzureCLI` |
| .NET 9 SDK | Already used for local dev |
| Node.js 22+ | For building Angular |

---

## Quick deploy (automated script)

### 1. Log in to Azure

```powershell
az login
az account list -o table
az account set --subscription "Your Subscription Name"
```

### 2. Run the deploy script

```powershell
cd "C:\Users\shafiusa\Al-Haram POS\deploy\azure"
.\deploy.ps1
```

The script will:

1. Create a resource group
2. Create Azure SQL server + database
3. Create App Service plan (F1 Free) + Web App
4. Build Angular and publish the API with `wwwroot`
5. Deploy a zip to Azure
6. Save credentials to `deploy/azure/.deployment-secrets.local.json` (not committed to git)

### 3. Open the app

Wait 1–2 minutes for the first startup (database migration), then open the URL printed by the script.

---

## Manual step-by-step (if you prefer)

### Step 1 — Variables

Pick a **globally unique** app name (lowercase, numbers, hyphens only):

```powershell
$RG = "alharam-pos-rg"
$LOCATION = "westeurope"
$APP = "alharam-pos-12345"          # change this
$SQL = "$APP-sql"
$SQL_USER = "sqladmin"
$SQL_PASS = "YourStrong!Pass123"    # save this securely
```

### Step 2 — Resource group

```powershell
az group create --name $RG --location $LOCATION
```

### Step 3 — Azure SQL

```powershell
az sql server create -g $RG -n $SQL -l $LOCATION -u $SQL_USER -p $SQL_PASS

az sql server firewall-rule create -g $RG -s $SQL -n AllowAzure `
  --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0

az sql db create -g $RG -s $SQL -n AlHaramDb --edition Basic --capacity 5
```

### Step 4 — App Service (Free F1)

```powershell
az appservice plan create -g $RG -n "$APP-plan" -l $LOCATION --sku F1 --is-linux

az webapp create -g $RG -p "$APP-plan" -n $APP --runtime "DOTNETCORE:9.0"
```

### Step 5 — App settings

```powershell
$CONN = "Server=tcp:$SQL.database.windows.net,1433;Initial Catalog=AlHaramDb;User ID=$SQL_USER;Password=$SQL_PASS;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

az webapp config connection-string set -g $RG -n $APP `
  --connection-string-type SQLServer --settings DefaultConnection=$CONN

az webapp config appsettings set -g $RG -n $APP --settings `
  ASPNETCORE_ENVIRONMENT=Production `
  Jwt__Secret="CHANGE_TO_LONG_RANDOM_STRING_AT_LEAST_32_CHARS" `
  Storage__RootPath=/home/site/data
```

### Step 6 — Build & publish locally

```powershell
cd "C:\Users\shafiusa\Al-Haram POS\client"
npm ci
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build -- --configuration production

cd ..
dotnet publish src/AlHaram.Api/AlHaram.Api.csproj -c Release -o ./publish/azure

mkdir publish/azure/wwwroot -Force
Copy-Item client/dist/client/browser/* publish/azure/wwwroot -Recurse -Force
```

### Step 7 — Deploy zip

```powershell
Compress-Archive -Path publish/azure/* -DestinationPath publish/azure-deploy.zip -Force

az webapp deploy -g $RG -n $APP --src-path publish/azure-deploy.zip --type zip
```

### Step 8 — Open the site

```powershell
start "https://$APP.azurewebsites.net"
```

---

## Cost summary

| Service | Tier | Typical cost |
|---------|------|----------------|
| App Service | **F1 Free** | $0 |
| Azure SQL | Basic (5 DTU) | ~$5/month |
| **Total** | | **~$5/month** after trial |

During the **Azure free trial**, the $200 credit usually covers this for several months.

---

## Free tier limitations (important for client demo)

| Limitation | Impact |
|------------|--------|
| F1 app sleeps when idle | First load after idle can take 30–60 seconds |
| F1 CPU cap | Fine for demo; not for heavy daily production use |
| Azure SQL Basic | Small DB; enough for demo / small business |
| File uploads | Stored on App Service disk (`/home/site/data`); fine for demo |

For production later, upgrade to **App Service B1** (~$13/mo) and consider **Azure Blob Storage** for files.

---

## Redeploy after code changes

```powershell
cd deploy/azure
.\deploy.ps1 -ResourceGroup "alharam-pos-rg" -AppName "your-existing-app-name"
```

Or rebuild manually (Steps 6–7) using the same app name.

---

## Troubleshooting

### App shows “Application Error”

```powershell
az webapp log tail -g alharam-pos-rg -n YOUR_APP_NAME
```

Common causes:

- SQL firewall — ensure `AllowAzure` rule exists
- Wrong connection string — check App Service → Configuration → Connection strings
- JWT secret too short — must be at least 32 characters

### Login works locally but not on Azure

- Database is empty on first run — wait for migration; default user is seeded automatically
- Try: admin / Admin@123

### Logo upload fails

- Check `Storage__RootPath=/home/site/data` is set in App Service configuration

### Delete everything (stop billing)

```powershell
az group delete --name alharam-pos-rg --yes --no-wait
```

---

## Security checklist before sharing with client

- [ ] Change default admin password after first login (add user management when ready)
- [ ] Use a strong `Jwt__Secret` (script generates one automatically)
- [ ] Do not commit `.deployment-secrets.local.json`
- [ ] Restrict SQL firewall to Azure only (script does this)

---

## Next steps (optional)

- Custom domain + HTTPS (free on App Service)
- GitHub Actions CI/CD for automatic deploy
- Azure Blob Storage for permanent file uploads
- Upgrade to B1 for always-on performance
