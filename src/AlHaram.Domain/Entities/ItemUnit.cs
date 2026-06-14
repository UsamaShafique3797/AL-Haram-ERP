using AlHaram.Domain.Common;

namespace AlHaram.Domain.Entities;

/// <summary>
/// Links an item to a sellable/purchasable unit and how it converts to the item's
/// base unit. Example: a 12mm × 40ft bar with base unit "kg" might have a "piece"
/// unit with <see cref="ConversionFactor"/> = 7.4 (kg per piece).
/// </summary>
public class ItemUnit : BaseEntity
{
    public Guid ItemId { get; set; }
    public Item? Item { get; set; }

    public Guid UnitId { get; set; }
    public Unit? Unit { get; set; }

    /// <summary>How many base units equal one of this unit. The base unit itself = 1.</summary>
    public decimal ConversionFactor { get; set; } = 1m;

    public bool IsBaseUnit { get; set; }
}
