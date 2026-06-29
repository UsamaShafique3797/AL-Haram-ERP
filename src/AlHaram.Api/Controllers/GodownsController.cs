using AlHaram.Application.Godowns;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GodownsController : ControllerBase
{
    private readonly IGodownService _godowns;

    public GodownsController(IGodownService godowns) => _godowns = godowns;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => Ok(await _godowns.GetAllAsync(ct));

    // All godowns regardless of branch scope — needed so a branch user can pick a
    // transfer destination outside their own godown.
    [HttpGet("all")]
    public async Task<IActionResult> GetAllUnscoped(CancellationToken ct)
        => Ok(await _godowns.GetAllUnscopedAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var godown = await _godowns.GetByIdAsync(id, ct);
        return godown is null ? NotFound() : Ok(godown);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Administrator},{AppRoles.Manager}")]
    public async Task<IActionResult> Create([FromBody] SaveGodownRequest request, CancellationToken ct)
    {
        var created = await _godowns.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Administrator},{AppRoles.Manager}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveGodownRequest request, CancellationToken ct)
    {
        var updated = await _godowns.UpdateAsync(id, request, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Administrator},{AppRoles.Manager}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var ok = await _godowns.DeleteAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }
}
