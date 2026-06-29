using System.Diagnostics;
using System.IO;
using System.Net.Http;

namespace AlHaram.Desktop.Services;



public sealed class ApiHostService : IAsyncDisposable

{

    private readonly DesktopSettings _settings;

    private Process? _process;

    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(2) };



    public ApiHostService(DesktopSettings settings) => _settings = settings;



    public string EffectiveBaseUrl { get; private set; } = string.Empty;



    public async Task StartAsync(CancellationToken cancellationToken = default)

    {

        var ports = new[] { _settings.ApiPort, 5228, 5229, 5230 }.Distinct().ToArray();

        Exception? lastError = null;



        foreach (var port in ports)

        {

            var baseUrl = $"http://127.0.0.1:{port}";



            if (await IsApplicationReadyAsync(baseUrl, cancellationToken))

            {

                EffectiveBaseUrl = baseUrl;

                return;

            }



            if (await IsApiHealthyAsync(baseUrl, cancellationToken))

            {

                // Another server (usually dev API) — try the next port.

                continue;

            }



            try

            {

                await StartApiProcessAsync(baseUrl, cancellationToken);

                EffectiveBaseUrl = baseUrl;

                return;

            }

            catch (Exception ex)

            {

                lastError = ex;

                await StopOwnedProcessAsync();

            }

        }



        throw lastError ?? new InvalidOperationException(

            "Could not start the Al-Haram API. Close other terminals running dotnet run and try again.");

    }



    private async Task StartApiProcessAsync(string baseUrl, CancellationToken cancellationToken)

    {

        var (fileName, arguments, workingDirectory) = ResolveApiLaunch();

        Directory.CreateDirectory(_settings.StorageRoot);



        var psi = new ProcessStartInfo

        {

            FileName = fileName,

            Arguments = arguments,

            WorkingDirectory = workingDirectory,

            UseShellExecute = false,

            CreateNoWindow = true,

            RedirectStandardOutput = true,

            RedirectStandardError = true,

        };



        psi.Environment["ASPNETCORE_ENVIRONMENT"] = "Desktop";

        psi.Environment["ASPNETCORE_URLS"] = baseUrl;

        psi.Environment["ConnectionStrings__DefaultConnection"] = _settings.ConnectionString;

        psi.Environment["Storage__RootPath"] = _settings.StorageRoot;



        _process = Process.Start(psi)

            ?? throw new InvalidOperationException("Could not start the Al-Haram API process.");



        var deadline = DateTime.UtcNow.AddMinutes(2);

        while (DateTime.UtcNow < deadline)

        {

            cancellationToken.ThrowIfCancellationRequested();



            if (await IsApplicationReadyAsync(baseUrl, cancellationToken))

                return;



            if (_process.HasExited)

            {

                throw new InvalidOperationException(

                    $"The API stopped during startup on {baseUrl} (exit code {_process.ExitCode}). " +

                    "Check that SQL Server Express is installed and running.");

            }



            await Task.Delay(500, cancellationToken);

        }



        throw new TimeoutException($"The API on {baseUrl} did not become ready within 2 minutes.");

    }



    private async Task StopOwnedProcessAsync()

    {

        if (_process is null || _process.HasExited)

        {

            _process = null;

            return;

        }



        try

        {

            if (!_process.HasExited)

                _process.Kill(entireProcessTree: true);

        }

        catch

        {

            // Best effort.

        }



        _process = null;

        await Task.Delay(300);

    }



    private async Task<bool> IsApplicationReadyAsync(string baseUrl, CancellationToken cancellationToken)

    {

        if (!await IsApiHealthyAsync(baseUrl, cancellationToken))

            return false;



        return await IsEndpointOkAsync(baseUrl, "/", cancellationToken)

               || await IsEndpointOkAsync(baseUrl, "/index.html", cancellationToken);

    }



    private async Task<bool> IsEndpointOkAsync(string baseUrl, string path, CancellationToken cancellationToken)

    {

        try

        {

            using var response = await _http.GetAsync($"{baseUrl}{path}", cancellationToken);

            return response.IsSuccessStatusCode;

        }

        catch

        {

            return false;

        }

    }



    private async Task<bool> IsApiHealthyAsync(string baseUrl, CancellationToken cancellationToken)

    {

        try

        {

            using var response = await _http.GetAsync($"{baseUrl}/api/company/branding", cancellationToken);

            return response.IsSuccessStatusCode;

        }

        catch

        {

            return false;

        }

    }



    private (string FileName, string Arguments, string WorkingDirectory) ResolveApiLaunch()

    {

        var publishedExe = Path.Combine(AppContext.BaseDirectory, "api", "AlHaram.Api.exe");

        if (File.Exists(publishedExe))

            return (publishedExe, string.Empty, Path.GetDirectoryName(publishedExe)!);



        var repoApiProject = FindDevApiProject();

        if (repoApiProject is not null)

        {

            var projectDir = Path.GetDirectoryName(repoApiProject)!;

            return ("dotnet", $"run --project \"{repoApiProject}\" --launch-profile http", projectDir);

        }



        throw new FileNotFoundException(

            "Al-Haram API not found. Run desktop/publish.ps1 to build the desktop package.");

    }



    private static string? FindDevApiProject()

    {

        var dir = new DirectoryInfo(AppContext.BaseDirectory);

        while (dir is not null)

        {

            var candidate = Path.Combine(dir.FullName, "src", "AlHaram.Api", "AlHaram.Api.csproj");

            if (File.Exists(candidate))

                return candidate;

            dir = dir.Parent;

        }



        return null;

    }



    public async ValueTask DisposeAsync()

    {

        _http.Dispose();

        await StopOwnedProcessAsync();

    }

}


