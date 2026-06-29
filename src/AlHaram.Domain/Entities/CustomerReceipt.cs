using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

/// <summary>
/// Money received from a customer. Total receipt amount is split across
/// <see cref="Allocations"/> against outstanding invoices; any unallocated
/// portion sits as advance/on-account.
/// </summary>
public class CustomerReceipt : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public Guid CustomerId { get; set; }
    public Customer? Customer { get; set; }

    /// <summary>Branch (godown) this receipt was collected at. Null only for legacy rows.</summary>
    public Guid? GodownId { get; set; }
    public Godown? Godown { get; set; }

    public Guid PaymentAccountId { get; set; }
    public PaymentAccount? PaymentAccount { get; set; }

    public PaymentMode Mode { get; set; } = PaymentMode.Cash;

    public decimal Amount { get; set; }

    /// <summary>Cheque number / bank reference / online txn id.</summary>
    public string? Reference { get; set; }
    public string? Notes { get; set; }

    public ICollection<ReceiptAllocation> Allocations { get; set; } = new List<ReceiptAllocation>();
}

/// <summary>
/// Links a <see cref="CustomerReceipt"/> amount to a specific <see cref="SalesInvoice"/>.
/// Sum of allocations must be &lt;= the receipt amount.
/// </summary>
public class ReceiptAllocation : BaseEntity
{
    public Guid CustomerReceiptId { get; set; }
    public CustomerReceipt? CustomerReceipt { get; set; }

    public Guid SalesInvoiceId { get; set; }
    public SalesInvoice? SalesInvoice { get; set; }

    public decimal Amount { get; set; }
}
