using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

/// <summary>
/// A credit note / sales return. Restocks items and reduces what the customer owes.
/// Always linked to the original invoice so allocations stay consistent.
/// </summary>
public class SalesReturn : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public Guid CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public Guid GodownId { get; set; }
    public Godown? Godown { get; set; }

    public Guid SalesInvoiceId { get; set; }
    public SalesInvoice? SalesInvoice { get; set; }

    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Total { get; set; }

    public string? Reason { get; set; }
    public string? Notes { get; set; }

    public ICollection<SalesReturnLine> Lines { get; set; } = new List<SalesReturnLine>();
}

public class SalesReturnLine : BaseEntity
{
    public Guid SalesReturnId { get; set; }
    public SalesReturn? SalesReturn { get; set; }

    public Guid ItemId { get; set; }
    public Item? Item { get; set; }

    public Guid UnitId { get; set; }
    public Unit? Unit { get; set; }

    public decimal Quantity { get; set; }
    public decimal ConversionFactor { get; set; } = 1m;
    public decimal BaseQuantity { get; set; }
    public decimal Rate { get; set; }
    public decimal LineTotal { get; set; }

    /// <summary>Cost used to restock (taken from the original invoice line).</summary>
    public decimal UnitCost { get; set; }
    public decimal LineCost { get; set; }
}
