using System.IO;
using System.Windows;
using AlHaram.Desktop.Services;
using Microsoft.Web.WebView2.Core;

namespace AlHaram.Desktop;

public partial class MainWindow : Window
{
    private readonly DesktopSettings _settings = DesktopSettings.Load();
    private ApiHostService? _apiHost;
    private BackupService? _backupService;

    public MainWindow()
    {
        InitializeComponent();
        Title = _settings.WindowTitle;
        Loaded += OnLoadedAsync;
        Closed += OnClosedAsync;
    }

    private async void OnLoadedAsync(object sender, RoutedEventArgs e)
    {
        await StartApplicationAsync();
    }

    private async void OnClosedAsync(object? sender, EventArgs e)
    {
        if (_backupService is not null)
        {
            await _backupService.SafeRunAsync(force: false);
            await _backupService.DisposeAsync();
        }

        if (_apiHost is not null)
            await _apiHost.DisposeAsync();
    }

    private async void Retry_Click(object sender, RoutedEventArgs e)
    {
        ErrorPanel.Visibility = Visibility.Collapsed;
        LoadingPanel.Visibility = Visibility.Visible;
        WebView.Visibility = Visibility.Collapsed;
        await StartApplicationAsync();
    }

    private async Task StartApplicationAsync()
    {
        try
        {
            StatusText.Text = "Starting API and applying database updates…";
            _apiHost?.DisposeAsync();
            _apiHost = new ApiHostService(_settings);
            await _apiHost.StartAsync();

            StatusText.Text = "Loading application…";
            Directory.CreateDirectory(_settings.WebViewDataFolder);
            var webViewEnv = await CoreWebView2Environment.CreateAsync(
                browserExecutableFolder: null,
                userDataFolder: _settings.WebViewDataFolder);
            await WebView.EnsureCoreWebView2Async(webViewEnv);
            WebView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            WebView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            WebView.CoreWebView2.NewWindowRequested += (_, args) =>
            {
                args.Handled = true;
                WebView.CoreWebView2.Navigate(args.Uri);
            };

            WebView.Source = new Uri(_apiHost.EffectiveBaseUrl);
            LoadingPanel.Visibility = Visibility.Collapsed;
            WebView.Visibility = Visibility.Visible;

            _backupService ??= new BackupService(_settings);
            _backupService.Start();
        }
        catch (Exception ex)
        {
            ShowError(ex);
        }
    }

    private void ShowError(Exception ex)
    {
        LoadingPanel.Visibility = Visibility.Collapsed;
        WebView.Visibility = Visibility.Collapsed;
        ErrorPanel.Visibility = Visibility.Visible;
        var hint = ex is UnauthorizedAccessException
            || ex.Message.Contains("0x80070005")
            || ex.Message.Contains("Access is denied")
            ? "The app could not write to a required folder. Try running it once as Administrator, " +
              "or reinstall the latest version."
            : "Make sure SQL Server is installed and running, and that the connection string in " +
              "appsettings.json (next to the desktop app) points to the correct server.";

        ErrorText.Text = ex.Message + "\n\n" + hint;
    }
}
