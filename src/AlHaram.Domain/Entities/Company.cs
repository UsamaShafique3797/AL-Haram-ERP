using AlHaram.Domain.Common;

namespace AlHaram.Domain.Entities;

/// <summary>
/// The business that owns the system. A single record in Phase 0.
/// </summary>
public class Company : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? LegalName { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? TaxNumber { get; set; }
    public string? LogoUrl { get; set; }

    public string Currency { get; set; } = "PKR";
    public decimal DefaultTaxRate { get; set; }
}
