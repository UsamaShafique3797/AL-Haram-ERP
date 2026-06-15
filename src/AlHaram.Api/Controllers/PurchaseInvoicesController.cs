using AlHaram.Application.Purchasing;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/purchase-invoices")]
[Authorize]
public class PurchaseInvoicesController : ControllerBase
{
    private readonly IPurchaseInvoiceService _service;

    public PurchaseInvoicesController(IPurchaseInvoiceService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? supplierId, CancellationToken ct)
        => Ok(await _service.GetAllAsync(supplierId, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var invoice = await _service.GetByIdAsync(id, ct);
        return invoice is null ? NotFound() : Ok(invoice);
    }

    [HttpGet("open/{supplierId:guid}")]
    public async Task<IActionResult> GetOpenForSupplier(Guid supplierId, CancellationToken ct)
        => Ok(await _service.GetOpenInvoicesAsync(supplierId, ct));

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.StoreKeeper},{AppRoles.Accountant}")]
    public async Task<IActionResult> Create([FromBody] SavePurchaseInvoiceRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAsync(request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }
}
