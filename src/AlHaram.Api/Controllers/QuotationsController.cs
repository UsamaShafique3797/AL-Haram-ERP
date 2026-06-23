using AlHaram.Application.Sales;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/quotations")]
[Authorize]
public class QuotationsController : ControllerBase
{
    private readonly IQuotationService _service;

    public QuotationsController(IQuotationService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? customerId, CancellationToken ct)
        => Ok(await _service.GetAllAsync(customerId, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var quote = await _service.GetByIdAsync(id, ct);
        return quote is null ? NotFound() : Ok(quote);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.Salesman}")]
    public async Task<IActionResult> Create([FromBody] SaveQuotationRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAsync(request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.Salesman}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveQuotationRequest request, CancellationToken ct)
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

    [HttpPost("{id:guid}/convert")]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.Salesman}")]
    public async Task<IActionResult> ConvertToInvoice(Guid id, [FromBody] SaveSalesInvoiceRequest request, CancellationToken ct)
    {
        var result = await _service.ConvertToInvoiceAsync(id, request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }
}
