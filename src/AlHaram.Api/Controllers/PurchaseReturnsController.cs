using AlHaram.Application.Purchasing;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/purchase-returns")]
[Authorize]
public class PurchaseReturnsController : ControllerBase
{
    private readonly IPurchaseReturnService _service;

    public PurchaseReturnsController(IPurchaseReturnService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => Ok(await _service.GetAllAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var ret = await _service.GetByIdAsync(id, ct);
        return ret is null ? NotFound() : Ok(ret);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper},{AppRoles.Accountant}")]
    public async Task<IActionResult> Create([FromBody] SavePurchaseReturnRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAsync(request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }
}
