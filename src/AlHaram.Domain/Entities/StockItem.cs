using AlHaram.Domain.Common;

namespace AlHaram.Domain.Entities;

/// <summary>
/// Current quantity on hand and weighted-average cost for an item in a godown.
/// One row per (Item, Godown).
/// </summary>
public class StockItem : BaseEntity
{
    public Guid ItemId { get; set; }
    public Item? Item { get; set; }

    public Guid GodownId { get; set; }
    public Godown? Godown { get; set; }

    /// <summary>Quantity on hand in the item's base unit.</summary>
    public decimal Quantity { get; set; }

    /// <summary>Weighted-average cost per base unit.</summary>
    public decimal AverageCost { get; set; }
}
