using AlHaram.Application.Common;
using AlHaram.Application.Finance;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class DayBookService : IDayBookService
{
    private readonly AppDbContext _db;
    private readonly IBranchScope _branch;

    public DayBookService(AppDbContext db, IBranchScope branch)
    {
        _db = db;
        _branch = branch;
    }

    public async Task<DayBookDto> GetForDateAsync(DateTime date, CancellationToken ct = default)
    {
        var dayStart = date.Date;
        var dayEnd = dayStart.AddDays(1).AddTicks(-1);

        var txns = await _db.CashBankTransactions
            .Include(t => t.PaymentAccount)
            .Where(t => t.Date >= dayStart && t.Date <= dayEnd)
            .ForBranch(_branch)
            .OrderBy(t => t.PaymentAccount!.Name)
            .ThenBy(t => t.CreatedAt)
            .ToListAsync(ct);

        var entries = txns.Select(t =>
        {
            var moneyIn = t.Amount > 0 ? t.Amount : 0m;
            var moneyOut = t.Amount < 0 ? -t.Amount : 0m;
            return new DayBookEntryDto(
                t.PaymentAccountId,
                t.PaymentAccount?.Name ?? string.Empty,
                t.PaymentAccount?.Type.ToString() ?? string.Empty,
                t.Date, t.Source.ToString(), t.Reference, t.Notes,
                moneyIn, moneyOut);
        }).ToList();

        var totalIn = entries.Sum(e => e.MoneyIn);
        var totalOut = entries.Sum(e => e.MoneyOut);

        return new DayBookDto(dayStart, totalIn, totalOut, totalIn - totalOut, entries);
    }
}
