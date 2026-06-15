using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

/// <summary>
/// A bill received from a supplier. Lines add stock at weighted-average cost
/// and post a payable; any "paid now" amount also posts a cash/bank outflow.
/// </summary>
public class PurchaseInvoice : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public Guid SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public Guid GodownId { get; set; }
    public Godown? Godown { get; set; }

    public PurchaseDocStatus Status { get; set; } = PurchaseDocStatus.Posted;

    public decimal Discount { get; set; }
    public decimal TaxRate { get; set; }

    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Total { get; set; }

    /// <summary>How much was paid at point of purchase. Remainder is on credit.</summary>
    public decimal PaidAmount { get; set; }

    public Guid? PaymentAccountId { get; set; }
    public PaymentAccount? PaymentAccount { get; set; }

    public string? Notes { get; set; }

    public ICollection<PurchaseInvoiceLine> Lines { get; set; } = new List<PurchaseInvoiceLine>();
}

public class PurchaseInvoiceLine : BaseEntity
{
    public Guid PurchaseInvoiceId { get; set; }
    public PurchaseInvoice? PurchaseInvoice { get; set; }

    public Guid ItemId { get; set; }
    public Item? Item { get; set; }

    public Guid UnitId { get; set; }
    public Unit? Unit { get; set; }

    public decimal Quantity { get; set; }
    public decimal ConversionFactor { get; set; } = 1m;
    public decimal BaseQuantity { get; set; }

    /// <summary>Rate per selected unit (purchase cost).</summary>
    public decimal Rate { get; set; }

    public decimal Discount { get; set; }
    public decimal LineTotal { get; set; }

    /// <summary>Unit cost in base units used for stock posting (Rate / ConversionFactor).</summary>
    public decimal UnitCost { get; set; }

    public decimal LineCost { get; set; }
}
