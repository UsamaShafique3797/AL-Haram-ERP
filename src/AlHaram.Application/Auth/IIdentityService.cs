using AlHaram.Application.Common.Models;

namespace AlHaram.Application.Auth;

public interface IIdentityService
{
    Task<Result<AuthResult>> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<Result<UserDto>> CreateUserAsync(CreateUserRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<UserDto>> GetUsersAsync(CancellationToken ct = default);
    Task<UserDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
}
