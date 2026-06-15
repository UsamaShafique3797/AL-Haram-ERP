using AlHaram.Application.Finance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/day-book")]
[Authorize]
public class DayBookController : ControllerBase
{
    private readonly IDayBookService _service;

    public DayBookController(IDayBookService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] DateTime date, CancellationToken ct)
        => Ok(await _service.GetForDateAsync(date == default ? DateTime.UtcNow.Date : date, ct));
}
