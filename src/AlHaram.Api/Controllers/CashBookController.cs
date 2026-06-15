using AlHaram.Application.Finance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/cash-book")]
[Authorize]
public class CashBookController : ControllerBase
{
    private readonly ICashBookService _service;

    public CashBookController(ICashBookService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
        => Ok(await _service.GetAllAsync(from, to, ct));

    [HttpGet("{paymentAccountId:guid}")]
    public async Task<IActionResult> GetByAccount(Guid paymentAccountId, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
    {
        var book = await _service.GetByAccountAsync(paymentAccountId, from, to, ct);
        return book is null ? NotFound() : Ok(book);
    }
}
