using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

/// <summary>
/// A cash or bank account that money flows through (e.g. "Cash drawer", "HBL current").
/// </summary>
public class PaymentAccount : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public PaymentAccountType Type { get; set; } = PaymentAccountType.Cash;

    public string? AccountNumber { get; set; }
    public string? BankName { get; set; }

    /// <summary>Balance at go-live (signed: + cash on hand, + bank balance).</summary>
    public decimal OpeningBalance { get; set; }

    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
}
