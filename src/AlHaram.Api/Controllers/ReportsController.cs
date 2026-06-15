using AlHaram.Application.Finance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reports;
    private readonly IProfitLossService _profitLoss;

    public ReportsController(IReportService reports, IProfitLossService profitLoss)
    {
        _reports = reports;
        _profitLoss = profitLoss;
    }

    [HttpGet("profit-loss")]
    public async Task<IActionResult> ProfitLoss(
        [FromQuery] DateTime from, [FromQuery] DateTime to, [FromQuery] bool breakdown = true, CancellationToken ct = default)
    {
        if (from == default || to == default)
            return BadRequest(new { errors = new[] { "from and to dates are required." } });
        return Ok(await _profitLoss.GetAsync(from, to, breakdown, ct));
    }

    [HttpGet("sales")]
    public async Task<IActionResult> Sales([FromQuery] DateTime from, [FromQuery] DateTime to, CancellationToken ct = default)
    {
        if (from == default || to == default)
            return BadRequest(new { errors = new[] { "from and to dates are required." } });
        return Ok(await _reports.GetSalesReportAsync(from, to, ct));
    }

    [HttpGet("purchases")]
    public async Task<IActionResult> Purchases([FromQuery] DateTime from, [FromQuery] DateTime to, CancellationToken ct = default)
    {
        if (from == default || to == default)
            return BadRequest(new { errors = new[] { "from and to dates are required." } });
        return Ok(await _reports.GetPurchaseReportAsync(from, to, ct));
    }

    [HttpGet("stock-valuation")]
    public async Task<IActionResult> StockValuation(CancellationToken ct)
        => Ok(await _reports.GetStockValuationReportAsync(ct));

    [HttpGet("expenses")]
    public async Task<IActionResult> Expenses([FromQuery] DateTime from, [FromQuery] DateTime to, CancellationToken ct = default)
    {
        if (from == default || to == default)
            return BadRequest(new { errors = new[] { "from and to dates are required." } });
        return Ok(await _reports.GetExpenseReportAsync(from, to, ct));
    }
}
