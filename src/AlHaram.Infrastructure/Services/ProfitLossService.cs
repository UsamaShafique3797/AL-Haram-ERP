using AlHaram.Application.Common;
using AlHaram.Application.Finance;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class ProfitLossService : IProfitLossService
{
    private readonly AppDbContext _db;
    private readonly IBranchScope _branch;

    public ProfitLossService(AppDbContext db, IBranchScope branch)
    {
        _db = db;
        _branch = branch;
    }

    public async Task<ProfitLossDto> GetAsync(DateTime from, DateTime to, bool includeBreakdown = true, CancellationToken ct = default)
    {
        var fromDate = from.Date;
        var toDate = to.Date.AddDays(1).AddTicks(-1);
        var branchId = _branch.EffectiveGodownId;

        var salesInvoices = _db.SalesInvoices
            .Where(i => i.Date >= fromDate && i.Date <= toDate)
            .ForBranch(_branch);

        var revenue = await salesInvoices.SumAsync(i => (decimal?)i.Total, ct) ?? 0m;

        var salesReturnsQuery = _db.SalesReturns
            .Where(r => r.Date >= fromDate && r.Date <= toDate)
            .ForBranch(_branch);
        var salesReturns = await salesReturnsQuery.SumAsync(r => (decimal?)r.Total, ct) ?? 0m;

        var cogs = await salesInvoices.SumAsync(i => (decimal?)i.CostOfGoodsSold, ct) ?? 0m;

        var returnCogsQuery = _db.SalesReturnLines
            .Where(l => l.SalesReturn!.Date >= fromDate && l.SalesReturn.Date <= toDate);
        if (branchId is Guid g)
            returnCogsQuery = returnCogsQuery.Where(l => l.SalesReturn!.GodownId == g);
        var returnCogs = await returnCogsQuery.SumAsync(l => (decimal?)l.LineCost, ct) ?? 0m;

        var expenses = await _db.Expenses
            .Where(e => e.Date >= fromDate && e.Date <= toDate)
            .ForBranch(_branch)
            .SumAsync(e => (decimal?)e.Amount, ct) ?? 0m;

        var netRevenue = revenue - salesReturns;
        var netCogs = cogs - returnCogs;
        var grossProfit = netRevenue - netCogs;
        var netProfit = grossProfit - expenses;

        IReadOnlyList<ProfitLossCategoryBreakdownDto> expenseByCategory = Array.Empty<ProfitLossCategoryBreakdownDto>();
        IReadOnlyList<ProfitLossItemBreakdownDto> itemBreakdown = Array.Empty<ProfitLossItemBreakdownDto>();

        if (includeBreakdown)
        {
            var expenseGroups = await _db.Expenses
                .Where(e => e.Date >= fromDate && e.Date <= toDate)
                .ForBranch(_branch)
                .GroupBy(e => e.ExpenseCategory!.Name)
                .Select(g => new { Name = g.Key, Amount = g.Sum(x => x.Amount) })
                .OrderByDescending(x => x.Amount)
                .ToListAsync(ct);

            expenseByCategory = expenseGroups
                .Select(x => new ProfitLossCategoryBreakdownDto(x.Name, x.Amount))
                .ToList();

            var soldLinesQuery = _db.SalesInvoiceLines
                .Include(l => l.Item)
                .Include(l => l.SalesInvoice)
                .Where(l => l.SalesInvoice!.Date >= fromDate && l.SalesInvoice.Date <= toDate);
            if (branchId is Guid bg)
                soldLinesQuery = soldLinesQuery.Where(l => l.SalesInvoice!.GodownId == bg);

            var soldLines = await soldLinesQuery
                .GroupBy(l => new { l.ItemId, l.Item!.Code, l.Item.Name })
                .Select(g => new
                {
                    g.Key.ItemId,
                    g.Key.Code,
                    g.Key.Name,
                    Revenue = g.Sum(x => x.LineTotal),
                    Cost = g.Sum(x => x.LineCost)
                })
                .ToListAsync(ct);

            var returnLinesQuery = _db.SalesReturnLines
                .Include(l => l.Item)
                .Include(l => l.SalesReturn)
                .Where(l => l.SalesReturn!.Date >= fromDate && l.SalesReturn.Date <= toDate);
            if (branchId is Guid rg)
                returnLinesQuery = returnLinesQuery.Where(l => l.SalesReturn!.GodownId == rg);

            var returnLines = await returnLinesQuery
                .GroupBy(l => l.ItemId)
                .Select(g => new { ItemId = g.Key, Revenue = g.Sum(x => x.LineTotal), Cost = g.Sum(x => x.LineCost) })
                .ToDictionaryAsync(x => x.ItemId, ct);

            itemBreakdown = soldLines
                .Select(s =>
                {
                    returnLines.TryGetValue(s.ItemId, out var ret);
                    var rev = s.Revenue - (ret?.Revenue ?? 0m);
                    var cost = s.Cost - (ret?.Cost ?? 0m);
                    return new ProfitLossItemBreakdownDto(s.ItemId, s.Code, s.Name, rev, cost, rev - cost);
                })
                .Where(x => x.Revenue != 0 || x.Cost != 0)
                .OrderByDescending(x => x.GrossProfit)
                .ToList();
        }

        return new ProfitLossDto(
            fromDate, to.Date,
            revenue, salesReturns, netRevenue,
            netCogs, grossProfit, expenses, netProfit,
            expenseByCategory, itemBreakdown);
    }
}
