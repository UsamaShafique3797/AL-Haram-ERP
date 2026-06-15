using AlHaram.Application.Finance;
using AlHaram.Application.Purchasing;
using AlHaram.Application.Sales;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;
    private readonly ICustomerLedgerService _ledger;
    private readonly ISupplierLedgerService _supplierLedger;
    private readonly IProfitLossService _profitLoss;

    public DashboardService(
        AppDbContext db,
        ICustomerLedgerService ledger,
        ISupplierLedgerService supplierLedger,
        IProfitLossService profitLoss)
    {
        _db = db;
        _ledger = ledger;
        _supplierLedger = supplierLedger;
        _profitLoss = profitLoss;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1).AddTicks(-1);

        var salesMonth = await _db.SalesInvoices
            .Where(i => i.Date >= monthStart && i.Date <= monthEnd)
            .SumAsync(i => (decimal?)i.Total, ct) ?? 0m;

        var purchasesMonth = await _db.PurchaseInvoices
            .Where(i => i.Date >= monthStart && i.Date <= monthEnd)
            .SumAsync(i => (decimal?)i.Total, ct) ?? 0m;

        var expensesMonth = await _db.Expenses
            .Where(e => e.Date >= monthStart && e.Date <= monthEnd)
            .SumAsync(e => (decimal?)e.Amount, ct) ?? 0m;

        var accounts = await _db.PaymentAccounts.ToListAsync(ct);
        var movements = await _db.CashBankTransactions
            .GroupBy(t => t.PaymentAccountId)
            .Select(g => new { Id = g.Key, Total = g.Sum(t => t.Amount) })
            .ToDictionaryAsync(x => x.Id, x => x.Total, ct);

        decimal cashBalance = 0m, bankBalance = 0m;
        foreach (var a in accounts.Where(a => a.IsActive))
        {
            var balance = a.OpeningBalance + movements.GetValueOrDefault(a.Id);
            if (a.Type == PaymentAccountType.Cash) cashBalance += balance;
            else bankBalance += balance;
        }

        var receivables = (await _ledger.GetReceivablesAsync(ct))
            .Where(r => r.Outstanding > 0)
            .Sum(r => r.Outstanding);

        var payables = (await _supplierLedger.GetPayablesAsync(ct))
            .Where(p => p.Outstanding > 0)
            .Sum(p => p.Outstanding);

        var pl = await _profitLoss.GetAsync(monthStart, monthEnd, includeBreakdown: false, ct);

        return new DashboardSummaryDto(
            salesMonth,
            purchasesMonth,
            expensesMonth,
            cashBalance,
            bankBalance,
            receivables,
            payables,
            pl.NetProfit);
    }
}
