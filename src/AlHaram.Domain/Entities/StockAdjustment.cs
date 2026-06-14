using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

/// <summary>
/// A wastage / damage / correction document that posts stock movements when saved.
/// </summary>
public class StockAdjustment : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public Guid GodownId { get; set; }
    public Godown? Godown { get; set; }

    public string? Reason { get; set; }
    public string? Notes { get; set; }

    public ICollection<StockAdjustmentLine> Lines { get; set; } = new List<StockAdjustmentLine>();
}

/// <summary>
/// One item line of a <see cref="StockAdjustment"/>.
/// </summary>
public class StockAdjustmentLine : BaseEntity
{
    public Guid StockAdjustmentId { get; set; }
    public StockAdjustment? StockAdjustment { get; set; }

    public Guid ItemId { get; set; }
    public Item? Item { get; set; }

    public AdjustmentDirection Direction { get; set; }

    /// <summary>Positive quantity in base units; direction decides the sign.</summary>
    public decimal Quantity { get; set; }

    /// <summary>Cost per base unit used for increases (ignored for decreases).</summary>
    public decimal UnitCost { get; set; }

    public string? Notes { get; set; }
}
