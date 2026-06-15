using AlHaram.Application.Sales;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/customer-ledger")]
[Authorize]
public class CustomerLedgerController : ControllerBase
{
    private readonly ICustomerLedgerService _service;

    public CustomerLedgerController(ICustomerLedgerService service) => _service = service;

    [HttpGet("{customerId:guid}")]
    public async Task<IActionResult> GetLedger(Guid customerId, CancellationToken ct)
        => Ok(await _service.GetLedgerAsync(customerId, ct));

    [HttpGet("receivables")]
    public async Task<IActionResult> GetReceivables(CancellationToken ct)
        => Ok(await _service.GetReceivablesAsync(ct));
}
