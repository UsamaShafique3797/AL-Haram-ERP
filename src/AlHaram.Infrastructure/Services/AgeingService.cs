using AlHaram.Application.Common;
using AlHaram.Application.Sales;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class AgeingService : IAgeingService
{
    private readonly AppDbContext _db;
    private readonly IBranchScope _branch;

    public AgeingService(AppDbContext db, IBranchScope branch)
    {
        _db = db;
        _branch = branch;
    }

    public async Task<IReadOnlyList<ReceivableAgeingDto>> GetReceivablesAgeingAsync(CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;
        var customers = await _db.Customers.OrderBy(c => c.Name).ToListAsync(ct);
        var branchScoped = _branch.EffectiveGodownId is not null;

        var invoices = await _db.SalesInvoices
            .ForBranch(_branch)
            .Select(i => new { i.Id, i.CustomerId, i.Date, i.Total, i.PaidAmount })
            .ToListAsync(ct);

        var allocations = await _db.ReceiptAllocations
            .GroupBy(a => a.SalesInvoiceId)
            .Select(g => new { Id = g.Key, Total = g.Sum(a => a.Amount) })
            .ToDictionaryAsync(x => x.Id, x => x.Total, ct);

        var result = new List<ReceivableAgeingDto>();

        foreach (var customer in customers)
        {
            var custInvoices = invoices.Where(i => i.CustomerId == customer.Id).ToList();
            var buckets = CreateBuckets();
            decimal total = !branchScoped && customer.OpeningBalance > 0 ? customer.OpeningBalance : 0m;

            if (!branchScoped && customer.OpeningBalance > 0)
                AddToBucket(buckets, 999, customer.OpeningBalance);

            foreach (var inv in custInvoices)
            {
                var paid = inv.PaidAmount + allocations.GetValueOrDefault(inv.Id);
                var balance = inv.Total - paid;
                if (balance <= 0.0049m) continue;

                var days = (today - inv.Date.Date).Days;
                AddToBucket(buckets, days, balance);
                total += balance;
            }

            if (total > 0.0049m)
            {
                result.Add(new ReceivableAgeingDto(
                    customer.Id, customer.Name, customer.Phone, total, buckets));
            }
        }

        return result.OrderByDescending(r => r.TotalOutstanding).ToList();
    }

    public async Task<IReadOnlyList<PayableAgeingDto>> GetPayablesAgeingAsync(CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;
        var suppliers = await _db.Suppliers.OrderBy(s => s.Name).ToListAsync(ct);
        var branchScoped = _branch.EffectiveGodownId is not null;

        var invoices = await _db.PurchaseInvoices
            .ForBranch(_branch)
            .Select(i => new { i.Id, i.SupplierId, i.Date, i.Total, i.PaidAmount })
            .ToListAsync(ct);

        var allocations = await _db.PaymentAllocations
            .GroupBy(a => a.PurchaseInvoiceId)
            .Select(g => new { Id = g.Key, Total = g.Sum(a => a.Amount) })
            .ToDictionaryAsync(x => x.Id, x => x.Total, ct);

        var result = new List<PayableAgeingDto>();

        foreach (var supplier in suppliers)
        {
            var supInvoices = invoices.Where(i => i.SupplierId == supplier.Id).ToList();
            var buckets = CreateBuckets();
            decimal total = !branchScoped && supplier.OpeningBalance > 0 ? supplier.OpeningBalance : 0m;

            if (!branchScoped && supplier.OpeningBalance > 0)
                AddToBucket(buckets, 999, supplier.OpeningBalance);

            foreach (var inv in supInvoices)
            {
                var paid = inv.PaidAmount + allocations.GetValueOrDefault(inv.Id);
                var balance = inv.Total - paid;
                if (balance <= 0.0049m) continue;

                var days = (today - inv.Date.Date).Days;
                AddToBucket(buckets, days, balance);
                total += balance;
            }

            if (total > 0.0049m)
            {
                result.Add(new PayableAgeingDto(
                    supplier.Id, supplier.Name, supplier.Phone, total, buckets));
            }
        }

        return result.OrderByDescending(r => r.TotalOutstanding).ToList();
    }

    private static List<AgeingBucketDto> CreateBuckets() =>
    [
        new("Current (0–30 days)", 0, 30, 0m, 0),
        new("31–60 days", 31, 60, 0m, 0),
        new("61–90 days", 61, 90, 0m, 0),
        new("Over 90 days", 91, null, 0m, 0)
    ];

    private static void AddToBucket(List<AgeingBucketDto> buckets, int days, decimal amount)
    {
        AgeingBucketDto target;
        if (days <= 30) target = buckets[0];
        else if (days <= 60) target = buckets[1];
        else if (days <= 90) target = buckets[2];
        else target = buckets[3];

        var idx = buckets.IndexOf(target);
        buckets[idx] = target with { Amount = target.Amount + amount, InvoiceCount = target.InvoiceCount + 1 };
    }
}
