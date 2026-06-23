namespace AlHaram.Application.Companies;

public record CompanyBrandingDto(
    string Name,
    string? Tagline,
    string? LogoUrl);

public record CompanyDto(
    Guid Id,
    string Name,
    string? Tagline,
    string? LegalName,
    string? Address,
    string? Phone,
    string? Email,
    string? TaxNumber,
    string? LogoUrl,
    string Currency,
    decimal DefaultTaxRate);

public record UpdateCompanyRequest(
    string Name,
    string? Tagline,
    string? LegalName,
    string? Address,
    string? Phone,
    string? Email,
    string? TaxNumber,
    string? LogoUrl,
    string Currency,
    decimal DefaultTaxRate);

public interface ICompanyService
{
    Task<CompanyBrandingDto> GetBrandingAsync(CancellationToken ct = default);
    Task<CompanyDto> GetAsync(CancellationToken ct = default);
    Task<CompanyDto> UpdateAsync(UpdateCompanyRequest request, CancellationToken ct = default);
}
