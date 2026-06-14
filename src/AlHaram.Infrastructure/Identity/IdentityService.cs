using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AlHaram.Application.Auth;
using AlHaram.Application.Common.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AlHaram.Infrastructure.Identity;

public class IdentityService : IIdentityService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<ApplicationRole> _roleManager;
    private readonly JwtSettings _jwt;

    public IdentityService(
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager,
        IOptions<JwtSettings> jwt)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _jwt = jwt.Value;
    }

    public async Task<Result<AuthResult>> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByNameAsync(request.UserName);
        if (user is null || !user.IsActive)
            return Result<AuthResult>.Failure("Invalid username or password.");

        if (!await _userManager.CheckPasswordAsync(user, request.Password))
            return Result<AuthResult>.Failure("Invalid username or password.");

        var roles = await _userManager.GetRolesAsync(user);
        var (token, expires) = GenerateToken(user, roles);

        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var dto = ToDto(user, roles);
        return Result<AuthResult>.Success(new AuthResult(token, expires, dto));
    }

    public async Task<Result<UserDto>> CreateUserAsync(CreateUserRequest request, CancellationToken ct = default)
    {
        var existing = await _userManager.FindByNameAsync(request.UserName);
        if (existing is not null)
            return Result<UserDto>.Failure("A user with this username already exists.");

        var user = new ApplicationUser
        {
            UserName = request.UserName,
            FullName = request.FullName,
            Email = request.Email,
            IsActive = true
        };

        var created = await _userManager.CreateAsync(user, request.Password);
        if (!created.Succeeded)
            return Result<UserDto>.Failure(created.Errors.Select(e => e.Description).ToArray());

        var validRoles = request.Roles.Where(r => _roleManager.RoleExistsAsync(r).GetAwaiter().GetResult()).ToList();
        if (validRoles.Count > 0)
            await _userManager.AddToRolesAsync(user, validRoles);

        var roles = await _userManager.GetRolesAsync(user);
        return Result<UserDto>.Success(ToDto(user, roles));
    }

    public async Task<IReadOnlyList<UserDto>> GetUsersAsync(CancellationToken ct = default)
    {
        var users = _userManager.Users.ToList();
        var result = new List<UserDto>();
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            result.Add(ToDto(u, roles));
        }
        return result;
    }

    public async Task<UserDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return null;
        var roles = await _userManager.GetRolesAsync(user);
        return ToDto(user, roles);
    }

    private (string token, DateTime expires) GenerateToken(ApplicationUser user, IList<string> roles)
    {
        var expires = DateTime.UtcNow.AddMinutes(_jwt.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.UserName ?? string.Empty),
            new("fullName", user.FullName)
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var jwt = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(jwt), expires);
    }

    private static UserDto ToDto(ApplicationUser user, IList<string> roles) =>
        new(user.Id, user.UserName ?? string.Empty, user.FullName, user.Email, roles);
}
