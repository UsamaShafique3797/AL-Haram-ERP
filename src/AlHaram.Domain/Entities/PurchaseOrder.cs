using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

public class PurchaseOrder : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public DateTime? ExpectedDate { get; set; }

    public Guid SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public Guid GodownId { get; set; }
    public Godown? Godown { get; set; }

    public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Draft;

    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal TaxRate { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Total { get; set; }

    public string? Notes { get; set; }

    public ICollection<PurchaseOrderLine> Lines { get; set; } = new List<PurchaseOrderLine>();
}

public class PurchaseOrderLine : BaseEntity
{
    public Guid PurchaseOrderId { get; set; }
    public PurchaseOrder? PurchaseOrder { get; set; }

    public Guid ItemId { get; set; }
    public Item? Item { get; set; }

    public Guid UnitId { get; set; }
    public Unit? Unit { get; set; }

    public decimal Quantity { get; set; }
    public decimal ConversionFactor { get; set; } = 1m;
    public decimal BaseQuantity { get; set; }
    public decimal Rate { get; set; }
    public decimal Discount { get; set; }
    public decimal LineTotal { get; set; }

    /// <summary>Base quantity already received via GRN or purchase invoice.</summary>
    public decimal ReceivedQuantity { get; set; }
}
