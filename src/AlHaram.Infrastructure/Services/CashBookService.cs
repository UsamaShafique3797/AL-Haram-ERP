using AlHaram.Application.Finance;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class CashBookService : ICashBookService
{
    private readonly AppDbContext _db;

    public CashBookService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<CashBookDto>> GetAllAsync(DateTime? from = null, DateTime? to = null, CancellationToken ct = default)
    {
        var accounts = await _db.PaymentAccounts
            .OrderByDescending(p => p.IsDefault)
            .ThenBy(p => p.Name)
            .ToListAsync(ct);

        var result = new List<CashBookDto>();
        foreach (var account in accounts)
        {
            var book = await BuildBookAsync(account.Id, from, to, ct);
            if (book is not null) result.Add(book);
        }
        return result;
    }

    public async Task<CashBookDto?> GetByAccountAsync(Guid paymentAccountId, DateTime? from = null, DateTime? to = null, CancellationToken ct = default)
        => await BuildBookAsync(paymentAccountId, from, to, ct);

    private async Task<CashBookDto?> BuildBookAsync(Guid paymentAccountId, DateTime? from, DateTime? to, CancellationToken ct)
    {
        var account = await _db.PaymentAccounts.FirstOrDefaultAsync(p => p.Id == paymentAccountId, ct);
        if (account is null) return null;

        var txnQuery = _db.CashBankTransactions
            .Where(t => t.PaymentAccountId == paymentAccountId);

        decimal priorBalance = account.OpeningBalance;
        if (from is not null)
        {
            priorBalance += await txnQuery
                .Where(t => t.Date < from.Value)
                .SumAsync(t => (decimal?)t.Amount, ct) ?? 0m;
            txnQuery = txnQuery.Where(t => t.Date >= from.Value);
        }

        if (to is not null)
            txnQuery = txnQuery.Where(t => t.Date <= to.Value);

        var txns = await txnQuery
            .OrderBy(t => t.Date)
            .ThenBy(t => t.CreatedAt)
            .ToListAsync(ct);

        var entries = new List<CashBookEntryDto>();
        var balance = priorBalance;
        decimal totalIn = 0m, totalOut = 0m;

        foreach (var t in txns)
        {
            var moneyIn = t.Amount > 0 ? t.Amount : 0m;
            var moneyOut = t.Amount < 0 ? -t.Amount : 0m;
            balance += t.Amount;
            totalIn += moneyIn;
            totalOut += moneyOut;
            entries.Add(new CashBookEntryDto(
                t.Date, t.Source.ToString(), t.Reference, t.Notes,
                moneyIn, moneyOut, balance));
        }

        return new CashBookDto(
            account.Id, account.Name, account.Type.ToString(),
            priorBalance, totalIn, totalOut, balance, entries);
    }
}
