using AlHaram.Application.Purchasing;
using AlHaram.Domain.Constants;
using AlHaram.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/purchase-orders")]
[Authorize]
public class PurchaseOrdersController : ControllerBase
{
    private readonly IPurchaseOrderService _service;

    public PurchaseOrdersController(IPurchaseOrderService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? supplierId, CancellationToken ct)
        => Ok(await _service.GetAllAsync(supplierId, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var order = await _service.GetByIdAsync(id, ct);
        return order is null ? NotFound() : Ok(order);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager}")]
    public async Task<IActionResult> Create([FromBody] SavePurchaseOrderRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAsync(request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SavePurchaseOrderRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var ok = await _service.DeleteAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/status")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager}")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] PurchaseOrderStatus status, CancellationToken ct)
    {
        var result = await _service.UpdateStatusAsync(id, status, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }
}
