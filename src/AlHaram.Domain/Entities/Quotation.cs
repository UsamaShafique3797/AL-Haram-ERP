using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

public class Quotation : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public DateTime? ValidUntil { get; set; }

    public Guid CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public QuotationStatus Status { get; set; } = QuotationStatus.Draft;

    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal TaxRate { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Total { get; set; }

    public Guid? ConvertedSalesInvoiceId { get; set; }
    public SalesInvoice? ConvertedSalesInvoice { get; set; }

    public string? Notes { get; set; }

    public ICollection<QuotationLine> Lines { get; set; } = new List<QuotationLine>();
}

public class QuotationLine : BaseEntity
{
    public Guid QuotationId { get; set; }
    public Quotation? Quotation { get; set; }

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
}
