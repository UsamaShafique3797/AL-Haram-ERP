# Al-Haram POS — Desktop version

Runs the **same Angular + .NET API** in a native Windows window. Data stays on your PC in **SQL Server Express** (local database).

## Architecture

```
AlHaram.Desktop.exe  →  WebView2 window (UI)
        ↓ starts
AlHaram.Api.exe      →  local API on http://127.0.0.1:5227
        ↓ uses
SQL Server Express   →  AlHaramDb (up to 10 GB)
        ↓ files
%LocalAppData%\AlHaramPos\data  →  logos, PDF uploads
```

## Requirements

| Requirement | Notes |
|-------------|--------|
| Windows 10/11 | WPF + WebView2 |
| WebView2 Runtime | Usually preinstalled on Windows 11 |
| SQL Server Express | Default instance `.\SQLEXPRESS` |
| .NET 9 SDK | Dev/build only |
| Node.js 22+ | Build only |

## Build the desktop app

```powershell
cd "C:\Users\shafiusa\Al-Haram POS\desktop"
.\publish.ps1
```

Output folder:

```
publish/desktop/
  AlHaram.Desktop.exe      ← double-click to run
  appsettings.json         ← SQL connection string
  api/
    AlHaram.Api.exe
    wwwroot/               ← Angular UI
```

### Self-contained (includes .NET runtime)

```powershell
.\publish.ps1 -SelfContained
```

Larger download, but target PCs do not need .NET installed.

## Build a single-file installer (for client machines)

This produces one **`AlHaram-POS-Setup.exe`** you can copy to any client PC.
The installer bundles the UI, the API, **and** the .NET 9 runtime
(self-contained), creates Start Menu + Desktop shortcuts with the
Al-Haram Steel logo, and registers an entry in Add/Remove Programs.

**One-time setup on the build PC:** install Inno Setup 6

```powershell
winget install JRSoftware.InnoSetup
```

**Build the installer:**

```powershell
cd "C:\Users\shafiusa\Al-Haram POS\desktop"
.\build-installer.ps1
```

Output:

```
publish/installer/AlHaram-POS-Setup.exe   ← give this single file to the client
```

### Installing on the client PC

1. Copy `AlHaram-POS-Setup.exe` to the client machine and run it (accept the
   admin prompt). It installs to `C:\Program Files\Al-Haram POS`.
2. Make sure the two prerequisites below are present (most Windows 11 PCs
   already have WebView2; SQL must be installed once).
3. Launch **Al-Haram POS** from the Desktop / Start Menu shortcut.
   The API starts automatically inside the app — nothing to run separately.
4. First launch creates the local `AlHaramDb`, applies migrations, and seeds
   data (1–2 minutes). Login: **admin** / **Admin@123**.

### Client prerequisites

| Prerequisite | How to get it | Notes |
|--------------|---------------|-------|
| WebView2 Runtime | [Evergreen Bootstrapper](https://developer.microsoft.com/microsoft-edge/webview2/) | Preinstalled on Windows 11 and most updated Windows 10 |
| Local SQL engine | `winget install Microsoft.SQLServer.2022.Express` | Provides `.\SQLEXPRESS`. The DB itself is created automatically on first launch |

> The .NET runtime is **already bundled** in the installer (self-contained),
> so the client does **not** need to install .NET.

## Run (after publish)

1. Install **SQL Server Express** if not already installed.
2. Double-click **`publish/desktop/AlHaram.Desktop.exe`**
3. First start applies migrations and seeds data (1–2 minutes).
4. Login: **admin** / **Admin@123**

## Configuration

Edit `appsettings.json` next to `AlHaram.Desktop.exe`:

```json
{
  "ApiPort": 5227,
  "ConnectionString": "Server=.\\SQLEXPRESS;Database=AlHaramDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True",
  "WindowTitle": "Al-Haram POS"
}
```

Use your machine name instead of `.` if needed, e.g. `Server=MYPC\\SQLEXPRESS;...`

## Develop from source (without full publish)

```powershell
# Terminal 1 — build UI into API wwwroot once
cd client
npm run build -- --configuration production
cd ..
dotnet publish src/AlHaram.Api/AlHaram.Api.csproj -c Debug -o desktop/AlHaram.Desktop/bin/Debug/net9.0-windows/api
Copy-Item client/dist/client/browser/* desktop/AlHaram.Desktop/bin/Debug/net9.0-windows/api/wwwroot -Recurse -Force

# Terminal 2 — run desktop shell
dotnet run --project desktop/AlHaram.Desktop
```

## LAN access (optional)

By default the API binds to **127.0.0.1** (this PC only). Other PCs on the shop network cannot connect unless you change binding and firewall rules. For access from anywhere, use Azure cloud deployment instead.

## Backups (important for business)

The app makes **automatic backups by itself** — no action needed day to day.

- A `.bak` backup of `AlHaramDb` is created shortly after launch (max once per
  `BackupIntervalHours`) and again when the app closes.
- Primary location: `C:\ProgramData\AlHaramPos\backups`
- Backups older than `BackupKeepDays` are deleted automatically.

### Keep a copy off the machine (recommended)

Set a second folder so each backup is also copied somewhere safe — an external
drive, a network share, or a cloud-synced folder (OneDrive / Google Drive).
Edit `appsettings.json` next to the app:

```json
{
  "SecondaryBackupFolder": "C:\\Users\\<you>\\OneDrive\\AlHaramBackups",
  "BackupIntervalHours": 24,
  "BackupKeepDays": 30
}
```

After editing, restart the app. Every backup is then written to both folders.

### Restore from a backup (disaster recovery)

1. Close the Al-Haram POS app.
2. Run, from the `desktop` folder:

```powershell
.\restore-db.ps1 -BakFile "C:\ProgramData\AlHaramPos\backups\AlHaramDb_YYYYMMDD_HHMMSS.bak"
```

3. Start the app again.

> Also back up `%LocalAppData%\AlHaramPos\data` (uploaded logos / PDFs) if you
> use file uploads — copy that folder to the same safe location periodically.

## Cost

| Item | Cost |
|------|------|
| Desktop app | **$0** |
| SQL Server Express | **$0** |
| Azure / cloud | **Not required** |
