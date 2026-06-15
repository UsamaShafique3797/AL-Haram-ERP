using AlHaram.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _service;

    public AuditLogsController(IAuditLogService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetRecent([FromQuery] int limit = 100, CancellationToken ct = default)
        => Ok(await _service.GetRecentAsync(limit, ct));
}
