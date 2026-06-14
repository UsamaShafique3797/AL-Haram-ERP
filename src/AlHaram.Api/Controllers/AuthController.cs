using System.Security.Claims;
using AlHaram.Application.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IIdentityService _identity;

    public AuthController(IIdentityService identity) => _identity = identity;

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var result = await _identity.LoginAsync(request, ct);
        if (!result.Succeeded)
            return Unauthorized(new { errors = result.Errors });

        return Ok(result.Data);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (id is null || !Guid.TryParse(id, out var userId))
            return Unauthorized();

        var user = await _identity.GetByIdAsync(userId, ct);
        return user is null ? Unauthorized() : Ok(user);
    }
}
