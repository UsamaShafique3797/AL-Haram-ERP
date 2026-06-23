using AlHaram.Application.Production;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/production-orders")]
[Authorize]
public class ProductionOrdersController : ControllerBase
{
    private readonly IProductionOrderService _service;

    public ProductionOrdersController(IProductionOrderService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => Ok(await _service.GetAllAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var order = await _service.GetByIdAsync(id, ct);
        return order is null ? NotFound() : Ok(order);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper}")]
    public async Task<IActionResult> Create([FromBody] SaveProductionOrderRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAsync(request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveProductionOrderRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }

    [HttpPost("{id:guid}/complete")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper}")]
    public async Task<IActionResult> Complete(Guid id, CancellationToken ct)
    {
        var result = await _service.CompleteAsync(id, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper}")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var result = await _service.CancelAsync(id, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }
}
