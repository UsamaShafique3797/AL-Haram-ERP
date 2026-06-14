using AlHaram.Application.Suppliers;
using AlHaram.Domain.Entities;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class SupplierService : ISupplierService
{
    private readonly AppDbContext _db;

    public SupplierService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<SupplierDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.Suppliers
            .OrderBy(s => s.Name)
            .Select(s => ToDto(s))
            .ToListAsync(ct);
    }

    public async Task<SupplierDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var s = await _db.Suppliers.FirstOrDefaultAsync(x => x.Id == id, ct);
        return s is null ? null : ToDto(s);
    }

    public async Task<SupplierDto> CreateAsync(SaveSupplierRequest request, CancellationToken ct = default)
    {
        var supplier = new Supplier();
        Apply(supplier, request);
        _db.Suppliers.Add(supplier);
        await _db.SaveChangesAsync(ct);
        return ToDto(supplier);
    }

    public async Task<SupplierDto?> UpdateAsync(Guid id, SaveSupplierRequest request, CancellationToken ct = default)
    {
        var supplier = await _db.Suppliers.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (supplier is null) return null;

        Apply(supplier, request);
        await _db.SaveChangesAsync(ct);
        return ToDto(supplier);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var supplier = await _db.Suppliers.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (supplier is null) return false;

        _db.Suppliers.Remove(supplier);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private static void Apply(Supplier s, SaveSupplierRequest r)
    {
        s.Name = r.Name;
        s.Code = r.Code;
        s.ContactPerson = r.ContactPerson;
        s.Phone = r.Phone;
        s.Email = r.Email;
        s.Address = r.Address;
        s.TaxNumber = r.TaxNumber;
        s.PaymentTermsDays = r.PaymentTermsDays;
        s.OpeningBalance = r.OpeningBalance;
        s.OpeningBalanceAsOf = r.OpeningBalanceAsOf;
        s.IsActive = r.IsActive;
    }

    private static SupplierDto ToDto(Supplier s) =>
        new(s.Id, s.Name, s.Code, s.ContactPerson, s.Phone, s.Email, s.Address, s.TaxNumber,
            s.PaymentTermsDays, s.OpeningBalance, s.OpeningBalanceAsOf, s.IsActive);
}
