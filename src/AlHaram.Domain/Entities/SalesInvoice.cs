using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

/// <summary>
/// A bill issued to a customer. Lines deduct stock at weighted-average cost
/// and post a receivable; any "paid now" amount also posts a cash/bank entry.
/// </summary>
public class SalesInvoice : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public Guid CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public Guid GodownId { get; set; }
    public Godown? Godown { get; set; }

    public SalesDocStatus Status { get; set; } = SalesDocStatus.Posted;

    /// <summary>Header-level discount in currency.</summary>
    public decimal Discount { get; set; }

    /// <summary>Header-level tax rate (%); applied after discount on the line subtotal.</summary>
    public decimal TaxRate { get; set; }

    // Snapshotted totals (computed at post time so reports stay consistent)
    public decimal Subtotal { get; set; }      // sum of line totals (qty * rate - line discount)
    public decimal TaxAmount { get; set; }     // (Subtotal - Discount) * TaxRate / 100
    public decimal Total { get; set; }         // Subtotal - Discount + TaxAmount

    /// <summary>How much was paid at point of sale (cash sale). Remainder is on credit.</summary>
    public decimal PaidAmount { get; set; }

    /// <summary>Payment account used for any paid-now amount. Null for fully credit sales.</summary>
    public Guid? PaymentAccountId { get; set; }
    public PaymentAccount? PaymentAccount { get; set; }

    /// <summary>Cost of goods sold for this invoice (sum of line costs at sale time).</summary>
    public decimal CostOfGoodsSold { get; set; }

    public string? Notes { get; set; }

    public ICollection<SalesInvoiceLine> Lines { get; set; } = new List<SalesInvoiceLine>();
}

/// <summary>
/// One line of a <see cref="SalesInvoice"/>. Quantities are entered in the chosen unit
/// but always stored converted to the item's base unit for stock posting.
/// </summary>
public class SalesInvoiceLine : BaseEntity
{
    public Guid SalesInvoiceId { get; set; }
    public SalesInvoice? SalesInvoice { get; set; }

    public Guid ItemId { get; set; }
    public Item? Item { get; set; }

    /// <summary>Unit selected on the line (base or one of the item's secondary units).</summary>
    public Guid UnitId { get; set; }
    public Unit? Unit { get; set; }

    /// <summary>Quantity as entered, in the selected <see cref="Unit"/>.</summary>
    public decimal Quantity { get; set; }

    /// <summary>Conversion factor selectedUnit → base unit (snapshot, for audit).</summary>
    public decimal ConversionFactor { get; set; } = 1m;

    /// <summary>Quantity in the item's base unit (Quantity * ConversionFactor).</summary>
    public decimal BaseQuantity { get; set; }

    /// <summary>Rate per selected unit.</summary>
    public decimal Rate { get; set; }

    /// <summary>Per-line discount in currency.</summary>
    public decimal Discount { get; set; }

    /// <summary>Quantity * Rate - Discount.</summary>
    public decimal LineTotal { get; set; }

    /// <summary>Weighted-average unit cost (in base units) at the moment of sale.</summary>
    public decimal UnitCost { get; set; }

    /// <summary>BaseQuantity * UnitCost.</summary>
    public decimal LineCost { get; set; }
}
