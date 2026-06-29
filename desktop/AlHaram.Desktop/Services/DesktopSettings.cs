using System.IO;

namespace AlHaram.Desktop.Services;

public sealed class DesktopSettings
{
    public int ApiPort { get; init; } = 5227;
    public string ConnectionString { get; init; } =
        "Server=.\\SQLEXPRESS;Database=AlHaramDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";
    public string WindowTitle { get; init; } = "Al-Haram Steel";

    // --- Automatic backup settings ---
    // Primary backup folder. Empty = C:\ProgramData\AlHaramPos\backups
    // (writable by both the app and the SQL Server service).
    public string BackupFolder { get; init; } = "";
    // Optional off-machine copy (external drive, network share, OneDrive, etc.).
    public string SecondaryBackupFolder { get; init; } = "";
    public int BackupIntervalHours { get; init; } = 24;
    public int BackupKeepDays { get; init; } = 30;

    public string ApiBaseUrl => $"http://127.0.0.1:{ApiPort}";

    // All writable data lives under %LocalAppData%\AlHaramPos so the app
    // works even when installed read-only under C:\Program Files.
    public string UserDataRoot =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AlHaramPos");

    public string StorageRoot => Path.Combine(UserDataRoot, "data");

    public string WebViewDataFolder => Path.Combine(UserDataRoot, "WebView2");

    // Shared (machine-wide) location so the SQL Server service account can
    // write backup files there. The installer grants Everyone access to it.
    public string EffectiveBackupFolder => string.IsNullOrWhiteSpace(BackupFolder)
        ? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "AlHaramPos", "backups")
        : BackupFolder;

    public string DatabaseName
    {
        get
        {
            try
            {
                var builder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(ConnectionString);
                return string.IsNullOrWhiteSpace(builder.InitialCatalog) ? "AlHaramDb" : builder.InitialCatalog;
            }
            catch
            {
                return "AlHaramDb";
            }
        }
    }

    public static DesktopSettings Load()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        if (!File.Exists(path))
            return new DesktopSettings();

        try
        {
            var json = File.ReadAllText(path);
            var loaded = System.Text.Json.JsonSerializer.Deserialize<DesktopSettings>(json, JsonOptions);
            return loaded ?? new DesktopSettings();
        }
        catch
        {
            return new DesktopSettings();
        }
    }

    private static readonly System.Text.Json.JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = System.Text.Json.JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };
}
