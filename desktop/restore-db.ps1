# Restores the Al-Haram POS database from a .bak backup file.
#
# IMPORTANT: Close the Al-Haram POS app first (so nothing is using the database).
#
# Usage:
#   .\restore-db.ps1 -BakFile "C:\ProgramData\AlHaramPos\backups\AlHaramDb_20260629_140000.bak"
#   .\restore-db.ps1 -BakFile "D:\Backups\AlHaramDb_20260629_140000.bak" -Server ".\SQLEXPRESS"

param(
    [Parameter(Mandatory = $true)][string]$BakFile,
    [string]$Server = ".\SQLEXPRESS",
    [string]$Database = "AlHaramDb"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BakFile)) { throw "Backup file not found: $BakFile" }

Add-Type -AssemblyName System.Data

function Invoke-Sql([string]$sql, [int]$timeout = 600) {
    $cs = "Server=$Server;Database=master;Integrated Security=True;TrustServerCertificate=True"
    $conn = New-Object System.Data.SqlClient.SqlConnection $cs
    $conn.Open()
    try {
        $cmd = $conn.CreateCommand()
        $cmd.CommandTimeout = $timeout
        $cmd.CommandText = $sql
        $cmd.ExecuteNonQuery() | Out-Null
    }
    finally { $conn.Close() }
}

Write-Host "Restoring [$Database] on [$Server] from:`n  $BakFile" -ForegroundColor Cyan

# Force exclusive access if the database already exists, then restore.
$exists = $false
try {
    $cs = "Server=$Server;Database=master;Integrated Security=True;TrustServerCertificate=True"
    $conn = New-Object System.Data.SqlClient.SqlConnection $cs
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT COUNT(*) FROM sys.databases WHERE name = @n"
    [void]$cmd.Parameters.AddWithValue("@n", $Database)
    $exists = ([int]$cmd.ExecuteScalar()) -gt 0
    $conn.Close()
}
catch { }

if ($exists) {
    Write-Host "Setting database to single-user mode..." -ForegroundColor Yellow
    Invoke-Sql "ALTER DATABASE [$Database] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;"
}

$bakEscaped = $BakFile.Replace("'", "''")
try {
    Write-Host "Restoring (this can take a minute)..." -ForegroundColor Yellow
    Invoke-Sql "RESTORE DATABASE [$Database] FROM DISK = N'$bakEscaped' WITH REPLACE, RECOVERY;"
}
finally {
    if ($exists) {
        Invoke-Sql "ALTER DATABASE [$Database] SET MULTI_USER;"
    }
}

Write-Host "`nRestore complete. You can start Al-Haram POS again." -ForegroundColor Green
