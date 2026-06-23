using AlHaram.Application.Stock;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StockController : ControllerBase
{
    private readonly IStockService _stock;

    public StockController(IStockService stock) => _stock = stock;

    [HttpGet("levels")]
    public async Task<IActionResult> GetLevels(CancellationToken ct)
        => Ok(await _stock.GetLevelsAsync(ct));

    [HttpGet("movements/{itemId:guid}")]
    public async Task<IActionResult> GetMovements(Guid itemId, [FromQuery] Guid? godownId, CancellationToken ct)
        => Ok(await _stock.GetMovementsAsync(itemId, godownId, ct));

    [HttpPost("opening")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper}")]
    public async Task<IActionResult> PostOpeningStock([FromBody] OpeningStockRequest request, CancellationToken ct)
    {
        var result = await _stock.PostOpeningStockAsync(request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }

    [HttpPut("levels")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper}")]
    public async Task<IActionResult> UpdateLevel([FromBody] UpdateStockLevelRequest request, CancellationToken ct)
    {
        var result = await _stock.UpdateStockLevelAsync(request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }

    [HttpDelete("levels/{itemId:guid}/{godownId:guid}")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper}")]
    public async Task<IActionResult> DeleteLevel(Guid itemId, Guid godownId, CancellationToken ct)
    {
        var result = await _stock.DeleteStockLevelAsync(itemId, godownId, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { errors = result.Errors });
    }

    [HttpGet("adjustments")]
    public async Task<IActionResult> GetAdjustments(CancellationToken ct)
        => Ok(await _stock.GetAdjustmentsAsync(ct));

    [HttpGet("adjustments/{id:guid}")]
    public async Task<IActionResult> GetAdjustment(Guid id, CancellationToken ct)
    {
        var adjustment = await _stock.GetAdjustmentByIdAsync(id, ct);
        return adjustment is null ? NotFound() : Ok(adjustment);
    }

    [HttpPost("adjustments")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper}")]
    public async Task<IActionResult> CreateAdjustment([FromBody] SaveStockAdjustmentRequest request, CancellationToken ct)
    {
        var result = await _stock.CreateAdjustmentAsync(request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }
}
