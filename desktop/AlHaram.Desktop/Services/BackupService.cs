using System.IO;
using Microsoft.Data.SqlClient;

namespace AlHaram.Desktop.Services;

/// <summary>
/// Creates periodic SQL Server backups of the local database and copies each
/// backup to an optional second folder (external drive / network share /
/// cloud-synced folder) so a copy lives off the machine.
///
/// SQL Server writes the .bak file itself, so the primary backup folder must be
/// writable by the SQL Server service account. We use a machine-wide
/// ProgramData folder that the installer grants Everyone access to.
/// </summary>
public sealed class BackupService : IAsyncDisposable
{
    private readonly DesktopSettings _settings;
    private System.Threading.Timer? _timer;

    public BackupService(DesktopSettings settings) => _settings = settings;

    public void Start()
    {
        var hours = Math.Max(1, _settings.BackupIntervalHours);
        var interval = TimeSpan.FromHours(hours);
        // First run shortly after launch, then on the configured interval.
        // Fire-and-forget; SafeRunAsync never throws.
        _timer = new System.Threading.Timer(
            _ => _ = SafeRunAsync(force: false),
            null,
            TimeSpan.FromSeconds(45),
            interval);
    }

    /// <summary>Best-effort backup that never throws (e.g. on app close).</summary>
    public async Task SafeRunAsync(bool force)
    {
        try { await RunAsync(force); }
        catch { /* Backups are best-effort; never block or crash the app. */ }
    }

    public async Task RunAsync(bool force)
    {
        var primary = _settings.EffectiveBackupFolder;
        Directory.CreateDirectory(primary);

        if (!force && BackedUpRecently(primary))
            return;

        var db = _settings.DatabaseName;
        var stamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        var fileName = $"{db}_{stamp}.bak";
        var primaryPath = Path.Combine(primary, fileName);

        await using (var conn = new SqlConnection(_settings.ConnectionString))
        {
            await conn.OpenAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandTimeout = 600;
            cmd.CommandText =
                $"BACKUP DATABASE [{db}] TO DISK = @path " +
                "WITH COPY_ONLY, INIT, FORMAT, " +
                "NAME = N'Al-Haram POS automatic backup'";
            cmd.Parameters.Add(new SqlParameter("@path", primaryPath));
            await cmd.ExecuteNonQueryAsync();
        }

        CopyToSecondary(primaryPath, fileName);
        Prune(primary);
        if (!string.IsNullOrWhiteSpace(_settings.SecondaryBackupFolder))
            Prune(_settings.SecondaryBackupFolder);
    }

    private bool BackedUpRecently(string folder)
    {
        try
        {
            var latest = new DirectoryInfo(folder)
                .GetFiles("*.bak")
                .OrderByDescending(f => f.LastWriteTimeUtc)
                .FirstOrDefault();
            if (latest is null) return false;
            var age = DateTime.UtcNow - latest.LastWriteTimeUtc;
            return age < TimeSpan.FromHours(Math.Max(1, _settings.BackupIntervalHours));
        }
        catch
        {
            return false;
        }
    }

    private void CopyToSecondary(string sourcePath, string fileName)
    {
        var secondary = _settings.SecondaryBackupFolder;
        if (string.IsNullOrWhiteSpace(secondary)) return;

        try
        {
            Directory.CreateDirectory(secondary);
            File.Copy(sourcePath, Path.Combine(secondary, fileName), overwrite: true);
        }
        catch
        {
            // Second location may be a disconnected drive / unavailable share.
        }
    }

    private void Prune(string folder)
    {
        try
        {
            var cutoff = DateTime.UtcNow.AddDays(-Math.Max(1, _settings.BackupKeepDays));
            foreach (var file in new DirectoryInfo(folder).GetFiles("*.bak"))
            {
                if (file.LastWriteTimeUtc < cutoff)
                {
                    try { file.Delete(); } catch { /* ignore locked/in-use files */ }
                }
            }
        }
        catch
        {
            // Folder may be unavailable; ignore.
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_timer is not null)
        {
            await _timer.DisposeAsync();
            _timer = null;
        }
    }
}
