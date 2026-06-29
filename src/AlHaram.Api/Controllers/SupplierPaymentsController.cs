using AlHaram.Application.Purchasing;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/supplier-payments")]
[Authorize]
public class SupplierPaymentsController : ControllerBase
{
    private readonly ISupplierPaymentService _service;

    public SupplierPaymentsController(ISupplierPaymentService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? supplierId, CancellationToken ct)
        => Ok(await _service.GetAllAsync(supplierId, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var payment = await _service.GetByIdAsync(id, ct);
        return payment is null ? NotFound() : Ok(payment);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Administrator},{AppRoles.Manager},{AppRoles.Accountant}")]
    public async Task<IActionResult> Create([FromBody] SaveSupplierPaymentRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAsync(request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }
}
