using AlHaram.Application.Sales;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/delivery-challans")]
[Authorize]
public class DeliveryChallansController : ControllerBase
{
    private readonly IDeliveryChallanService _service;

    public DeliveryChallansController(IDeliveryChallanService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? customerId, CancellationToken ct)
        => Ok(await _service.GetAllAsync(customerId, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var doc = await _service.GetByIdAsync(id, ct);
        return doc is null ? NotFound() : Ok(doc);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager},{AppRoles.Salesman}")]
    public async Task<IActionResult> Create([FromBody] SaveDeliveryChallanRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAsync(request, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { errors = result.Errors });
    }
}
