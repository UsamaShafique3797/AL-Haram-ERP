using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

/// <summary>
/// A buyer: retail walk-in, wholesale, or contractor/builder.
/// </summary>
public class Customer : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? TaxNumber { get; set; }

    public CustomerType Type { get; set; } = CustomerType.Retail;

    public decimal CreditLimit { get; set; }
    public int PaymentTermsDays { get; set; }

    /// <summary>Positive = customer owes us at go-live.</summary>
    public decimal OpeningBalance { get; set; }
    public DateTime? OpeningBalanceAsOf { get; set; }

    public bool IsActive { get; set; } = true;
}
