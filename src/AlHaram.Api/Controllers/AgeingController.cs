using AlHaram.Application.Sales;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/ageing")]
[Authorize]
public class AgeingController : ControllerBase
{
    private readonly IAgeingService _service;

    public AgeingController(IAgeingService service) => _service = service;

    [HttpGet("receivables")]
    public async Task<IActionResult> Receivables(CancellationToken ct)
        => Ok(await _service.GetReceivablesAgeingAsync(ct));

    [HttpGet("payables")]
    public async Task<IActionResult> Payables(CancellationToken ct)
        => Ok(await _service.GetPayablesAgeingAsync(ct));
}
