using AlHaram.Application.Common.Models;
using AlHaram.Application.Sales;
using AlHaram.Domain.Entities;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class PaymentAccountService : IPaymentAccountService
{
    private readonly AppDbContext _db;

    public PaymentAccountService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<PaymentAccountDto>> GetAllAsync(CancellationToken ct = default)
    {
        var accounts = await _db.PaymentAccounts
            .OrderByDescending(p => p.IsDefault)
            .ThenBy(p => p.Name)
            .ToListAsync(ct);

        var balances = await ComputeBalancesAsync(ct);
        return accounts.Select(p => ToDto(p, balances.GetValueOrDefault(p.Id))).ToList();
    }

    public async Task<PaymentAccountDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var p = await _db.PaymentAccounts.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (p is null) return null;
        var movements = await _db.CashBankTransactions
            .Where(t => t.PaymentAccountId == id)
            .SumAsync(t => (decimal?)t.Amount, ct) ?? 0m;
        return ToDto(p, movements);
    }

    public async Task<Result<PaymentAccountDto>> CreateAsync(SavePaymentAccountRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return Result<PaymentAccountDto>.Failure("Name is required.");

        if (request.IsDefault)
            await ClearDefaultAsync(ct);

        var entity = new PaymentAccount
        {
            Name = request.Name.Trim(),
            Type = request.Type,
            AccountNumber = request.AccountNumber,
            BankName = request.BankName,
            OpeningBalance = request.OpeningBalance,
            IsDefault = request.IsDefault,
            IsActive = request.IsActive
        };
        _db.PaymentAccounts.Add(entity);
        await _db.SaveChangesAsync(ct);
        return Result<PaymentAccountDto>.Success(ToDto(entity, 0m));
    }

    public async Task<Result<PaymentAccountDto>> UpdateAsync(Guid id, SavePaymentAccountRequest request, CancellationToken ct = default)
    {
        var entity = await _db.PaymentAccounts.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (entity is null) return Result<PaymentAccountDto>.Failure("Payment account not found.");

        if (request.IsDefault && !entity.IsDefault)
            await ClearDefaultAsync(ct);

        entity.Name = request.Name.Trim();
        entity.Type = request.Type;
        entity.AccountNumber = request.AccountNumber;
        entity.BankName = request.BankName;
        entity.OpeningBalance = request.OpeningBalance;
        entity.IsDefault = request.IsDefault;
        entity.IsActive = request.IsActive;

        await _db.SaveChangesAsync(ct);

        var movements = await _db.CashBankTransactions
            .Where(t => t.PaymentAccountId == id)
            .SumAsync(t => (decimal?)t.Amount, ct) ?? 0m;
        return Result<PaymentAccountDto>.Success(ToDto(entity, movements));
    }

    private async Task ClearDefaultAsync(CancellationToken ct)
    {
        await _db.PaymentAccounts.Where(p => p.IsDefault)
            .ForEachAsync(p => p.IsDefault = false, ct);
    }

    private async Task<Dictionary<Guid, decimal>> ComputeBalancesAsync(CancellationToken ct)
    {
        return await _db.CashBankTransactions
            .GroupBy(t => t.PaymentAccountId)
            .Select(g => new { Id = g.Key, Total = g.Sum(t => t.Amount) })
            .ToDictionaryAsync(x => x.Id, x => x.Total, ct);
    }

    private static PaymentAccountDto ToDto(PaymentAccount p, decimal movements) =>
        new(p.Id, p.Name, p.Type, p.AccountNumber, p.BankName,
            p.OpeningBalance, p.OpeningBalance + movements, p.IsDefault, p.IsActive);
}
