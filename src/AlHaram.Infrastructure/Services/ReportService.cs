using AlHaram.Application.Finance;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class ReportService : IReportService
{
    private readonly AppDbContext _db;

    public ReportService(AppDbContext db) => _db = db;

    public async Task<SalesReportDto> GetSalesReportAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        var fromDate = from.Date;
        var toDate = to.Date.AddDays(1).AddTicks(-1);

        var invoices = await _db.SalesInvoices
            .Include(i => i.Customer)
            .Where(i => i.Date >= fromDate && i.Date <= toDate)
            .OrderBy(i => i.Date)
            .ThenBy(i => i.Number)
            .ToListAsync(ct);

        var invoiceIds = invoices.Select(i => i.Id).ToList();
        var allocated = invoiceIds.Count == 0
            ? new Dictionary<Guid, decimal>()
            : await _db.ReceiptAllocations
                .Where(a => invoiceIds.Contains(a.SalesInvoiceId))
                .GroupBy(a => a.SalesInvoiceId)
                .Select(g => new { Id = g.Key, Total = g.Sum(x => x.Amount) })
                .ToDictionaryAsync(x => x.Id, x => x.Total, ct);

        var lines = invoices.Select(i =>
        {
            var alloc = allocated.GetValueOrDefault(i.Id);
            var balance = i.Total - i.PaidAmount - alloc;
            return new SalesReportLineDto(
                i.Id, i.Number, i.Date, i.Customer?.Name ?? string.Empty,
                i.Subtotal, i.Discount, i.TaxAmount, i.Total,
                i.PaidAmount + alloc, balance,
                i.CostOfGoodsSold, i.Total - i.CostOfGoodsSold);
        }).ToList();

        return new SalesReportDto(
            fromDate, to.Date,
            lines.Count,
            lines.Sum(l => l.Total),
            lines.Sum(l => l.CostOfGoodsSold),
            lines.Sum(l => l.GrossProfit),
            lines);
    }

    public async Task<PurchaseReportDto> GetPurchaseReportAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        var fromDate = from.Date;
        var toDate = to.Date.AddDays(1).AddTicks(-1);

        var fullInvoices = await _db.PurchaseInvoices
            .Include(i => i.Supplier)
            .Where(i => i.Date >= fromDate && i.Date <= toDate)
            .OrderBy(i => i.Date)
            .ThenBy(i => i.Number)
            .ToListAsync(ct);

        if (fullInvoices.Count == 0)
        {
            return new PurchaseReportDto(
                fromDate, to.Date,
                "No purchase invoices in this period.",
                0, 0m, Array.Empty<PurchaseReportLineDto>());
        }

        var invoiceIds = fullInvoices.Select(i => i.Id).ToList();
        var allocated = await _db.PaymentAllocations
            .Where(a => invoiceIds.Contains(a.PurchaseInvoiceId))
            .GroupBy(a => a.PurchaseInvoiceId)
            .Select(g => new { Id = g.Key, Total = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.Id, x => x.Total, ct);

        var lines = fullInvoices.Select(i =>
        {
            var alloc = allocated.GetValueOrDefault(i.Id);
            var paid = i.PaidAmount + alloc;
            return new PurchaseReportLineDto(
                i.Id, i.Number, i.Date, i.Supplier?.Name ?? string.Empty,
                i.Subtotal, i.Discount, i.TaxAmount, i.Total, paid, i.Total - paid);
        }).ToList();

        return new PurchaseReportDto(
            fromDate, to.Date,
            $"{lines.Count} purchase invoice(s).",
            lines.Count,
            lines.Sum(l => l.Total),
            lines);
    }

    public async Task<StockValuationReportDto> GetStockValuationReportAsync(CancellationToken ct = default)
    {
        var items = await _db.Items
            .Include(i => i.Category)
            .Include(i => i.BaseUnit)
            .Where(i => i.TrackInventory && i.IsActive)
            .OrderBy(i => i.Category!.Name)
            .ThenBy(i => i.Name)
            .ToListAsync(ct);

        var stockByItem = await _db.StockItems
            .GroupBy(s => s.ItemId)
            .Select(g => new
            {
                ItemId = g.Key,
                Qty = g.Sum(x => x.Quantity),
                Value = g.Sum(x => x.Quantity * x.AverageCost)
            })
            .ToDictionaryAsync(x => x.ItemId, ct);

        var lines = new List<StockValuationLineDto>();
        foreach (var item in items)
        {
            var stock = stockByItem.GetValueOrDefault(item.Id);
            if (stock is null || stock.Qty == 0) continue;

            var avgCost = stock.Qty > 0 ? stock.Value / stock.Qty : 0m;
            lines.Add(new StockValuationLineDto(
                item.Id, item.Code, item.Name, item.Category?.Name ?? string.Empty,
                stock.Qty, item.BaseUnit?.Code ?? string.Empty, avgCost, stock.Value));
        }

        return new StockValuationReportDto(
            DateTime.UtcNow.Date,
            lines.Sum(l => l.StockValue),
            lines.Count,
            lines);
    }

    public async Task<ExpenseReportDto> GetExpenseReportAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        var fromDate = from.Date;
        var toDate = to.Date.AddDays(1).AddTicks(-1);

        var expenses = await _db.Expenses
            .Include(e => e.ExpenseCategory)
            .Include(e => e.PaymentAccount)
            .Where(e => e.Date >= fromDate && e.Date <= toDate)
            .OrderBy(e => e.Date)
            .ThenBy(e => e.Number)
            .ToListAsync(ct);

        var lines = expenses.Select(e => new ExpenseReportLineDto(
            e.Id, e.Number, e.Date,
            e.ExpenseCategory?.Name ?? string.Empty,
            e.PaymentAccount?.Name ?? string.Empty,
            e.Amount, e.Notes)).ToList();

        var byCategory = expenses
            .GroupBy(e => e.ExpenseCategory?.Name ?? "Uncategorized")
            .Select(g => new ProfitLossCategoryBreakdownDto(g.Key, g.Sum(x => x.Amount)))
            .OrderByDescending(x => x.Amount)
            .ToList();

        return new ExpenseReportDto(
            fromDate, to.Date,
            lines.Count, lines.Sum(l => l.Amount),
            lines, byCategory);
    }
}
