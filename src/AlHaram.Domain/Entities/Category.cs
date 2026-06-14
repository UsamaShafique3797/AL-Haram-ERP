using AlHaram.Domain.Common;

namespace AlHaram.Domain.Entities;

/// <summary>
/// Groups items (Steel Bars, Rings/Stirrups, Pillars, Cement, Aggregates…).
/// </summary>
public class Category : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Item> Items { get; set; } = new List<Item>();
}
