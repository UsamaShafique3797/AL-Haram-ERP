using AlHaram.Application.Customers;
using AlHaram.Domain.Entities;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class CustomerService : ICustomerService
{
    private readonly AppDbContext _db;

    public CustomerService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<CustomerDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.Customers
            .OrderBy(c => c.Name)
            .Select(c => ToDto(c))
            .ToListAsync(ct);
    }

    public async Task<CustomerDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var c = await _db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct);
        return c is null ? null : ToDto(c);
    }

    public async Task<CustomerDto> CreateAsync(SaveCustomerRequest request, CancellationToken ct = default)
    {
        var customer = new Customer();
        Apply(customer, request);
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(ct);
        return ToDto(customer);
    }

    public async Task<CustomerDto?> UpdateAsync(Guid id, SaveCustomerRequest request, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (customer is null) return null;

        Apply(customer, request);
        await _db.SaveChangesAsync(ct);
        return ToDto(customer);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (customer is null) return false;

        _db.Customers.Remove(customer);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private static void Apply(Customer c, SaveCustomerRequest r)
    {
        c.Name = r.Name;
        c.Code = r.Code;
        c.ContactPerson = r.ContactPerson;
        c.Phone = r.Phone;
        c.Email = r.Email;
        c.Address = r.Address;
        c.TaxNumber = r.TaxNumber;
        c.Type = r.Type;
        c.CreditLimit = r.CreditLimit;
        c.PaymentTermsDays = r.PaymentTermsDays;
        c.OpeningBalance = r.OpeningBalance;
        c.OpeningBalanceAsOf = r.OpeningBalanceAsOf;
        c.IsActive = r.IsActive;
    }

    private static CustomerDto ToDto(Customer c) =>
        new(c.Id, c.Name, c.Code, c.ContactPerson, c.Phone, c.Email, c.Address, c.TaxNumber,
            c.Type, c.CreditLimit, c.PaymentTermsDays, c.OpeningBalance, c.OpeningBalanceAsOf, c.IsActive);
}
