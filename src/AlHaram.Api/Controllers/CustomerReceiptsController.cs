using AlHaram.Application.Sales;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/customer-receipts")]
[Authorize]
public class CustomerReceiptsController : ControllerBase
{
    private readonly ICustomerReceiptService _service;

    public CustomerReceiptsController(ICustomerReceiptService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? customerId, CancellationToken ct)
        => Ok(await _service.GetAllAsync(customerId, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var r = await _service.GetByIdAsync(id, ct);
        return r is null ? NotFound() : Ok(r);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Administrator},{AppRoles.Manager},{AppRoles.Salesman},{AppRoles.Accountant}")]
    public async Task<IActionResult> Create([FromBody] SaveCustomerReceiptRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAsync(request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }
}
