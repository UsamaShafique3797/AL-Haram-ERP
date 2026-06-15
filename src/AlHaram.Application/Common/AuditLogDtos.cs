namespace AlHaram.Application.Common;

public record AuditLogDto(
    Guid Id,
    DateTime CreatedAt,
    string Action,
    string EntityType,
    Guid? EntityId,
    string? EntityNumber,
    string? UserName,
    string? Details);

public interface IAuditLogService
{
    Task LogAsync(string action, string entityType, Guid? entityId, string? entityNumber, string? userName, string? details, CancellationToken ct = default);
    Task<IReadOnlyList<AuditLogDto>> GetRecentAsync(int limit = 100, CancellationToken ct = default);
}
