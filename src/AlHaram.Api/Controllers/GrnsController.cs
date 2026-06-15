using AlHaram.Application.Purchasing;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/grns")]
[Authorize]
public class GrnsController : ControllerBase
{
    private readonly IGrnService _service;

    public GrnsController(IGrnService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? supplierId, CancellationToken ct)
        => Ok(await _service.GetAllAsync(supplierId, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var grn = await _service.GetByIdAsync(id, ct);
        return grn is null ? NotFound() : Ok(grn);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager}")]
    public async Task<IActionResult> Create([FromBody] SaveGrnRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAsync(request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }
}
