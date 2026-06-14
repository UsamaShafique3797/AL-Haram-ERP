using AlHaram.Domain.Common;

namespace AlHaram.Domain.Entities;

/// <summary>
/// Product master. Carries steel-specific attributes and links to its base unit
/// plus any secondary units (for weight ↔ piece selling).
/// </summary>
public class Item : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }

    public string? Brand { get; set; }
    public string? HsCode { get; set; }

    /// <summary>Base unit stock is stored in (e.g. kg). Conversions are relative to this.</summary>
    public Guid BaseUnitId { get; set; }
    public Unit? BaseUnit { get; set; }

    public decimal DefaultPurchaseRate { get; set; }
    public decimal DefaultSaleRate { get; set; }

    /// <summary>Reorder level, expressed in the base unit.</summary>
    public decimal ReorderLevel { get; set; }

    // Steel-specific attributes (all optional)
    public decimal? Diameter { get; set; }       // mm
    public string? Grade { get; set; }            // Grade 40 / Grade 60
    public decimal? Length { get; set; }          // ft
    public decimal? WeightPerPiece { get; set; }  // kg per piece

    public bool TrackInventory { get; set; } = true;
    public bool IsActive { get; set; } = true;

    public ICollection<ItemUnit> ItemUnits { get; set; } = new List<ItemUnit>();
}
