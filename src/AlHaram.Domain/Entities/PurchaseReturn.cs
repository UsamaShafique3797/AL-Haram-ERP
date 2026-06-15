using AlHaram.Domain.Common;

namespace AlHaram.Domain.Entities;

/// <summary>
/// A debit note / purchase return. Removes stock and reduces what we owe the supplier.
/// Always linked to the original purchase invoice.
/// </summary>
public class PurchaseReturn : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public Guid SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public Guid GodownId { get; set; }
    public Godown? Godown { get; set; }

    public Guid PurchaseInvoiceId { get; set; }
    public PurchaseInvoice? PurchaseInvoice { get; set; }

    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Total { get; set; }

    public string? Reason { get; set; }
    public string? Notes { get; set; }

    public ICollection<PurchaseReturnLine> Lines { get; set; } = new List<PurchaseReturnLine>();
}

public class PurchaseReturnLine : BaseEntity
{
    public Guid PurchaseReturnId { get; set; }
    public PurchaseReturn? PurchaseReturn { get; set; }

    public Guid ItemId { get; set; }
    public Item? Item { get; set; }

    public Guid UnitId { get; set; }
    public Unit? Unit { get; set; }

    public decimal Quantity { get; set; }
    public decimal ConversionFactor { get; set; } = 1m;
    public decimal BaseQuantity { get; set; }
    public decimal Rate { get; set; }
    public decimal LineTotal { get; set; }

    public decimal UnitCost { get; set; }
    public decimal LineCost { get; set; }
}
