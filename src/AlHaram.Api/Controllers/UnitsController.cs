using AlHaram.Application.Units;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UnitsController : ControllerBase
{
    private readonly IUnitService _units;

    public UnitsController(IUnitService units) => _units = units;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => Ok(await _units.GetAllAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var unit = await _units.GetByIdAsync(id, ct);
        return unit is null ? NotFound() : Ok(unit);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper}")]
    public async Task<IActionResult> Create([FromBody] SaveUnitRequest request, CancellationToken ct)
    {
        var created = await _units.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveUnitRequest request, CancellationToken ct)
    {
        var updated = await _units.UpdateAsync(id, request, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var ok = await _units.DeleteAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }
}
