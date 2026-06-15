using AlHaram.Application.Purchasing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/supplier-ledger")]
[Authorize]
public class SupplierLedgerController : ControllerBase
{
    private readonly ISupplierLedgerService _service;

    public SupplierLedgerController(ISupplierLedgerService service) => _service = service;

    [HttpGet("{supplierId:guid}")]
    public async Task<IActionResult> GetLedger(Guid supplierId, CancellationToken ct)
        => Ok(await _service.GetLedgerAsync(supplierId, ct));

    [HttpGet("payables")]
    public async Task<IActionResult> GetPayables(CancellationToken ct)
        => Ok(await _service.GetPayablesAsync(ct));
}
