using AlHaram.Domain.Common;

namespace AlHaram.Domain.Entities;

public class AuditLog : BaseEntity
{
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }
    public string? EntityNumber { get; set; }
    public string? UserName { get; set; }
    public string? Details { get; set; }
}
