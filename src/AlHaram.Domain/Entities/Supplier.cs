using AlHaram.Domain.Common;

namespace AlHaram.Domain.Entities;

/// <summary>
/// A vendor we buy material from.
/// </summary>
public class Supplier : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? TaxNumber { get; set; }

    public int PaymentTermsDays { get; set; }

    /// <summary>Positive = we owe the supplier at go-live.</summary>
    public decimal OpeningBalance { get; set; }
    public DateTime? OpeningBalanceAsOf { get; set; }

    public bool IsActive { get; set; } = true;
}
