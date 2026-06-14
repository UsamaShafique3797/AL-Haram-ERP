using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

/// <summary>
/// Immutable record of every stock in/out. <see cref="Quantity"/> is signed in the
/// item's base unit (positive = in, negative = out). Stores the resulting balance
/// and average cost so the ledger is fully reconstructable for reports and P&amp;L.
/// </summary>
public class StockMovement : BaseEntity
{
    public Guid ItemId { get; set; }
    public Item? Item { get; set; }

    public Guid GodownId { get; set; }
    public Godown? Godown { get; set; }

    public MovementType Type { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;

    /// <summary>Signed quantity in base units (+ in / - out).</summary>
    public decimal Quantity { get; set; }

    /// <summary>Cost per base unit applied to this movement.</summary>
    public decimal UnitCost { get; set; }

    /// <summary>On-hand quantity after this movement.</summary>
    public decimal QuantityAfter { get; set; }

    /// <summary>Weighted-average cost after this movement.</summary>
    public decimal AverageCostAfter { get; set; }

    public string? Reference { get; set; }
    public string? Notes { get; set; }
}
