using AlHaram.Application.Auth;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = $"{AppRoles.Owner},{AppRoles.Manager}")]
public class UsersController : ControllerBase
{
    private readonly IIdentityService _identity;

    public UsersController(IIdentityService identity) => _identity = identity;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => Ok(await _identity.GetUsersAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var user = await _identity.GetByIdAsync(id, ct);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request, CancellationToken ct)
    {
        var result = await _identity.CreateUserAsync(request, ct);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors });

        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result.Data);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request, CancellationToken ct)
    {
        var result = await _identity.UpdateUserAsync(id, request, ct);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors });
        return Ok(result.Data);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        var result = await _identity.DeactivateUserAsync(id, ct);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors });
        return NoContent();
    }

    [HttpGet("roles")]
    public IActionResult GetRoles() => Ok(AppRoles.All);
}
