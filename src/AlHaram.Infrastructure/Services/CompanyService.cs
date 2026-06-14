using AlHaram.Application.Companies;
using AlHaram.Domain.Entities;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class CompanyService : ICompanyService
{
    private readonly AppDbContext _db;

    public CompanyService(AppDbContext db) => _db = db;

    public async Task<CompanyDto> GetAsync(CancellationToken ct = default)
    {
        var company = await _db.Companies.FirstOrDefaultAsync(ct);
        if (company is null)
        {
            company = new Company { Name = "Al-Haram Steel" };
            _db.Companies.Add(company);
            await _db.SaveChangesAsync(ct);
        }
        return ToDto(company);
    }

    public async Task<CompanyDto> UpdateAsync(UpdateCompanyRequest request, CancellationToken ct = default)
    {
        var company = await _db.Companies.FirstOrDefaultAsync(ct);
        if (company is null)
        {
            company = new Company();
            _db.Companies.Add(company);
        }

        company.Name = request.Name;
        company.LegalName = request.LegalName;
        company.Address = request.Address;
        company.Phone = request.Phone;
        company.Email = request.Email;
        company.TaxNumber = request.TaxNumber;
        company.LogoUrl = request.LogoUrl;
        company.Currency = request.Currency;
        company.DefaultTaxRate = request.DefaultTaxRate;

        await _db.SaveChangesAsync(ct);
        return ToDto(company);
    }

    private static CompanyDto ToDto(Company c) =>
        new(c.Id, c.Name, c.LegalName, c.Address, c.Phone, c.Email, c.TaxNumber, c.LogoUrl, c.Currency, c.DefaultTaxRate);
}
