using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/files")]
[Authorize]
public class FilesController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;

    public FilesController(IWebHostEnvironment env, IConfiguration config)
    {
        _env = env;
        _config = config;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { errors = new[] { "No file uploaded." } });

        var allowed = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(ext))
            return BadRequest(new { errors = new[] { "File type not allowed." } });

        var uploadsDir = Path.Combine(GetStorageRoot(), "uploads");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid():N}{ext}";
        var path = Path.Combine(uploadsDir, fileName);

        await using var stream = System.IO.File.Create(path);
        await file.CopyToAsync(stream, ct);

        return Ok(new { path = $"uploads/{fileName}", fileName });
    }

    [HttpGet("{*filePath}")]
    [AllowAnonymous]
    public IActionResult GetFile(string filePath)
    {
        var root = GetStorageRoot();
        var fullPath = Path.GetFullPath(Path.Combine(root, filePath.Replace('/', Path.DirectorySeparatorChar)));
        if (!fullPath.StartsWith(Path.GetFullPath(root), StringComparison.OrdinalIgnoreCase))
            return BadRequest();

        if (!System.IO.File.Exists(fullPath))
            return NotFound();

        var contentType = Path.GetExtension(fullPath).ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };

        return PhysicalFile(fullPath, contentType);
    }

    private string GetStorageRoot()
    {
        var configured = _config["Storage:RootPath"]?.Trim();
        return string.IsNullOrEmpty(configured) ? _env.ContentRootPath : configured;
    }
}
