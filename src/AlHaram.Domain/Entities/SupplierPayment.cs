using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

/// <summary>
/// Money paid to a supplier. Total payment amount is split across
/// <see cref="Allocations"/> against outstanding purchase invoices.
/// </summary>
public class SupplierPayment : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public Guid SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    /// <summary>Branch (godown) this payment was made from. Null only for legacy rows.</summary>
    public Guid? GodownId { get; set; }
    public Godown? Godown { get; set; }

    public Guid PaymentAccountId { get; set; }
    public PaymentAccount? PaymentAccount { get; set; }

    public PaymentMode Mode { get; set; } = PaymentMode.Cash;

    public decimal Amount { get; set; }

    public string? Reference { get; set; }
    public string? Notes { get; set; }

    public ICollection<PaymentAllocation> Allocations { get; set; } = new List<PaymentAllocation>();
}

/// <summary>
/// Links a <see cref="SupplierPayment"/> amount to a specific <see cref="PurchaseInvoice"/>.
/// </summary>
public class PaymentAllocation : BaseEntity
{
    public Guid SupplierPaymentId { get; set; }
    public SupplierPayment? SupplierPayment { get; set; }

    public Guid PurchaseInvoiceId { get; set; }
    public PurchaseInvoice? PurchaseInvoice { get; set; }

    public decimal Amount { get; set; }
}
