namespace AlHaram.Application.Auth;

public record LoginRequest(string UserName, string Password);

public record AuthResult(
    string Token,
    DateTime ExpiresAt,
    UserDto User);

public record UserDto(
    Guid Id,
    string UserName,
    string FullName,
    string? Email,
    IList<string> Roles);

public record CreateUserRequest(
    string UserName,
    string FullName,
    string? Email,
    string Password,
    IList<string> Roles);
