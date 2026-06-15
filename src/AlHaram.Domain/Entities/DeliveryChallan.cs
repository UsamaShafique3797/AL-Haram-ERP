using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

/// <summary>
/// Delivery note accompanying goods sent to a customer. Deducts stock without posting receivables.
/// </summary>
public class DeliveryChallan : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public Guid CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public Guid GodownId { get; set; }
    public Godown? Godown { get; set; }

    public Guid? SalesInvoiceId { get; set; }
    public SalesInvoice? SalesInvoice { get; set; }

    public DeliveryChallanStatus Status { get; set; } = DeliveryChallanStatus.Posted;

    public string? VehicleNo { get; set; }
    public string? DriverName { get; set; }
    public string? Notes { get; set; }

    public ICollection<DeliveryChallanLine> Lines { get; set; } = new List<DeliveryChallanLine>();
}

public class DeliveryChallanLine : BaseEntity
{
    public Guid DeliveryChallanId { get; set; }
    public DeliveryChallan? DeliveryChallan { get; set; }

    public Guid ItemId { get; set; }
    public Item? Item { get; set; }

    public Guid UnitId { get; set; }
    public Unit? Unit { get; set; }

    public decimal Quantity { get; set; }
    public decimal ConversionFactor { get; set; } = 1m;
    public decimal BaseQuantity { get; set; }
}
