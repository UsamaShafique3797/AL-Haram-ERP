using AlHaram.Domain.Common;

namespace AlHaram.Domain.Entities;

/// <summary>
/// A business expense paid from a cash or bank account. Posts a negative <see cref="CashBankTransaction"/>.
/// </summary>
public class Expense : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public Guid ExpenseCategoryId { get; set; }
    public ExpenseCategory? ExpenseCategory { get; set; }

    public decimal Amount { get; set; }

    /// <summary>Branch (godown) this expense belongs to. Null only for legacy rows.</summary>
    public Guid? GodownId { get; set; }
    public Godown? Godown { get; set; }

    public Guid PaymentAccountId { get; set; }
    public PaymentAccount? PaymentAccount { get; set; }

    public string? Notes { get; set; }

    /// <summary>Optional path/URL to a receipt photo or scan.</summary>
    public string? AttachmentPath { get; set; }
}
