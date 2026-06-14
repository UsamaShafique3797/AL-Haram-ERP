using AlHaram.Domain.Common;

namespace AlHaram.Domain.Entities;

/// <summary>
/// A storage location / warehouse. The system supports multiple from day one.
/// </summary>
public class Godown : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; }
}
