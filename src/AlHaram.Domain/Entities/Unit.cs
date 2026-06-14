using AlHaram.Domain.Common;

namespace AlHaram.Domain.Entities;

/// <summary>
/// A unit of measure (kg, ton, piece, bundle, bag, cft). Per-item conversion
/// factors live on <see cref="ItemUnit"/> so the same unit can mean different
/// weights for different items.
/// </summary>
public class Unit : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
