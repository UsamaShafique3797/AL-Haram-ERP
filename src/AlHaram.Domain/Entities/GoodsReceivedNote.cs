using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

/// <summary>
/// Records physical receipt of goods into stock before or without a supplier bill.
/// </summary>
public class GoodsReceivedNote : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public Guid SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public Guid GodownId { get; set; }
    public Godown? Godown { get; set; }

    public Guid? PurchaseOrderId { get; set; }
    public PurchaseOrder? PurchaseOrder { get; set; }

    public GrnStatus Status { get; set; } = GrnStatus.Posted;

    public string? Notes { get; set; }

    public ICollection<GoodsReceivedNoteLine> Lines { get; set; } = new List<GoodsReceivedNoteLine>();
}

public class GoodsReceivedNoteLine : BaseEntity
{
    public Guid GoodsReceivedNoteId { get; set; }
    public GoodsReceivedNote? GoodsReceivedNote { get; set; }

    public Guid? PurchaseOrderLineId { get; set; }
    public PurchaseOrderLine? PurchaseOrderLine { get; set; }

    public Guid ItemId { get; set; }
    public Item? Item { get; set; }

    public Guid UnitId { get; set; }
    public Unit? Unit { get; set; }

    public decimal Quantity { get; set; }
    public decimal ConversionFactor { get; set; } = 1m;
    public decimal BaseQuantity { get; set; }

    /// <summary>Estimated unit cost in base units for stock valuation.</summary>
    public decimal UnitCost { get; set; }
    public decimal LineCost { get; set; }
}
