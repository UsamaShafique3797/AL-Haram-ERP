using AlHaram.Application.Common;
using AlHaram.Application.Finance;
using AlHaram.Application.Purchasing;
using AlHaram.Application.Sales;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;
    private readonly ICustomerLedgerService _ledger;
    private readonly ISupplierLedgerService _supplierLedger;
    private readonly IProfitLossService _profitLoss;
    private readonly IBranchScope _branch;

    public DashboardService(
        AppDbContext db,
        ICustomerLedgerService ledger,
        ISupplierLedgerService supplierLedger,
        IProfitLossService profitLoss,
        IBranchScope branch)
    {
        _db = db;
        _ledger = ledger;
        _supplierLedger = supplierLedger;
        _profitLoss = profitLoss;
        _branch = branch;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1).AddTicks(-1);

        var salesQuery = _db.SalesInvoices
            .Where(i => i.Date >= monthStart && i.Date <= monthEnd)
            .ForBranch(_branch);
        var salesMonth = await salesQuery.SumAsync(i => (decimal?)i.Total, ct) ?? 0m;

        var purchasesQuery = _db.PurchaseInvoices
            .Where(i => i.Date >= monthStart && i.Date <= monthEnd)
            .ForBranch(_branch);
        var purchasesMonth = await purchasesQuery.SumAsync(i => (decimal?)i.Total, ct) ?? 0m;

        var branchScoped = _branch.EffectiveGodownId is not null;

        var expensesMonth = await _db.Expenses
            .Where(e => e.Date >= monthStart && e.Date <= monthEnd)
            .ForBranch(_branch)
            .SumAsync(e => (decimal?)e.Amount, ct) ?? 0m;

        // Cash and bank balances follow the selected branch. A branch view sums only that
        // branch's money movements (opening balances are company-wide and therefore excluded);
        // the all-branches view includes opening balances plus every movement.
        decimal cashBalance = 0m, bankBalance = 0m;
        {
            var accounts = await _db.PaymentAccounts.ToListAsync(ct);
            var movements = await _db.CashBankTransactions
                .ForBranch(_branch)
                .GroupBy(t => t.PaymentAccountId)
                .Select(g => new { Id = g.Key, Total = g.Sum(t => t.Amount) })
                .ToDictionaryAsync(x => x.Id, x => x.Total, ct);

            foreach (var a in accounts.Where(a => a.IsActive))
            {
                var balance = (branchScoped ? 0m : a.OpeningBalance) + movements.GetValueOrDefault(a.Id);
                if (a.Type == PaymentAccountType.Cash) cashBalance += balance;
                else bankBalance += balance;
            }
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
