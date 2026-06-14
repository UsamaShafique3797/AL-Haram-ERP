using AlHaram.Application.Items;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ItemsController : ControllerBase
{
    private readonly IItemService _items;

    public ItemsController(IItemService items) => _items = items;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => Ok(await _items.GetAllAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var item = await _items.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper}")]
    public async Task<IActionResult> Create([FromBody] SaveItemRequest request, CancellationToken ct)
    {
        var result = await _items.CreateAsync(request, ct);
        if (!result.Succeeded) return BadRequest(new { errors = result.Errors });
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result.Data);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveItemRequest request, CancellationToken ct)
    {
        var result = await _items.UpdateAsync(id, request, ct);
        if (!result.Succeeded) return BadRequest(new { errors = result.Errors });
        return Ok(result.Data);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var ok = await _items.DeleteAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }
}
