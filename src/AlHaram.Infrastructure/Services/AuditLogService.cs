using AlHaram.Application.Common;
using AlHaram.Domain.Entities;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class AuditLogService : IAuditLogService
{
    private readonly AppDbContext _db;

    public AuditLogService(AppDbContext db) => _db = db;

    public async Task LogAsync(string action, string entityType, Guid? entityId, string? entityNumber, string? userName, string? details, CancellationToken ct = default)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            EntityNumber = entityNumber,
            UserName = userName,
            Details = details
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<AuditLogDto>> GetRecentAsync(int limit = 100, CancellationToken ct = default)
    {
        return await _db.AuditLogs
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Select(a => new AuditLogDto(a.Id, a.CreatedAt, a.Action, a.EntityType, a.EntityId, a.EntityNumber, a.UserName, a.Details))
            .ToListAsync(ct);
    }
}
