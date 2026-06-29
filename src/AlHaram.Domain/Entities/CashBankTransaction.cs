using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

/// <summary>
/// Every cash/bank movement. <see cref="Amount"/> is signed: positive = money in, negative = money out.
/// Drives cash book, bank book, day book, and dashboard "cash on hand" KPI.
/// </summary>
public class CashBankTransaction : BaseEntity
{
    public Guid PaymentAccountId { get; set; }
    public PaymentAccount? PaymentAccount { get; set; }

    /// <summary>Branch (godown) this money movement belongs to. Null only for legacy rows.</summary>
    public Guid? GodownId { get; set; }
    public Godown? Godown { get; set; }

    public DateTime Date { get; set; } = DateTime.UtcNow;

    public CashBankSource Source { get; set; }

    /// <summary>Signed amount; + in / - out.</summary>
    public decimal Amount { get; set; }

    /// <summary>Optional FK to the source document (invoice id, receipt id, expense id…).</summary>
    public Guid? SourceDocumentId { get; set; }

    /// <summary>Free-form short reference (invoice number, receipt number…).</summary>
    public string? Reference { get; set; }
    public string? Notes { get; set; }
}
