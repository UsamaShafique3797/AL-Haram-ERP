using AlHaram.Application.Production;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/boms")]
[Authorize]
public class BomsController : ControllerBase
{
    private readonly IBomService _service;

    public BomsController(IBomService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => Ok(await _service.GetAllAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var bom = await _service.GetByIdAsync(id, ct);
        return bom is null ? NotFound() : Ok(bom);
    }

    [HttpGet("by-finished-item/{finishedItemId:guid}")]
    public async Task<IActionResult> GetByFinishedItem(Guid finishedItemId, CancellationToken ct)
    {
        var bom = await _service.GetByFinishedItemIdAsync(finishedItemId, ct);
        return bom is null ? NotFound() : Ok(bom);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper}")]
    public async Task<IActionResult> Create([FromBody] SaveBillOfMaterialsRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAsync(request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveBillOfMaterialsRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var deleted = await _service.DeleteAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }
}
