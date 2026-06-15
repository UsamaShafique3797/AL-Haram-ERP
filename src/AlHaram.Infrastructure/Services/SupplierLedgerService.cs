using AlHaram.Application.Purchasing;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class SupplierLedgerService : ISupplierLedgerService
{
    private readonly AppDbContext _db;

    public SupplierLedgerService(AppDbContext db) => _db = db;

    public async Task<SupplierLedgerDto> GetLedgerAsync(Guid supplierId, CancellationToken ct = default)
    {
        var supplier = await _db.Suppliers.FirstOrDefaultAsync(s => s.Id == supplierId, ct)
            ?? throw new InvalidOperationException("Supplier not found.");

        var invoices = await _db.PurchaseInvoices
            .Where(i => i.SupplierId == supplierId)
            .Select(i => new { i.Id, i.Number, i.Date, i.Total, i.PaidAmount })
            .ToListAsync(ct);

        var payments = await _db.SupplierPayments
            .Include(r => r.PaymentAccount)
            .Where(r => r.SupplierId == supplierId)
            .Select(r => new { r.Id, r.Number, r.Date, r.Amount, PayAcc = r.PaymentAccount!.Name })
            .ToListAsync(ct);

        var returns = await _db.PurchaseReturns
            .Where(r => r.SupplierId == supplierId)
            .Select(r => new { r.Id, r.Number, r.Date, r.Total, InvoiceNumber = r.PurchaseInvoice!.Number })
            .ToListAsync(ct);

        var entries = new List<(DateTime Date, string Type, string Number, Guid? Id, string? Ref, decimal Debit, decimal Credit)>();

        foreach (var i in invoices)
        {
            entries.Add((i.Date, "Purchase invoice", i.Number, i.Id, null, 0m, i.Total));
            if (i.PaidAmount > 0)
                entries.Add((i.Date, "Cash purchase paid", i.Number, i.Id, "Paid at counter", i.PaidAmount, 0m));
        }
        foreach (var p in payments)
            entries.Add((p.Date, "Payment", p.Number, p.Id, p.PayAcc, p.Amount, 0m));
        foreach (var r in returns)
            entries.Add((r.Date, "Purchase return", r.Number, r.Id, r.InvoiceNumber, r.Total, 0m));

        var ordered = entries
            .OrderBy(e => e.Date)
            .ThenBy(e => e.Type == "Purchase invoice" ? 0 : 1)
            .ToList();

        var rows = new List<SupplierLedgerEntryDto>();
        var balance = supplier.OpeningBalance;

        if (supplier.OpeningBalance != 0)
            rows.Add(new SupplierLedgerEntryDto(
                supplier.OpeningBalanceAsOf ?? supplier.CreatedAt,
                "Opening balance", "—", null, null,
                supplier.OpeningBalance < 0 ? -supplier.OpeningBalance : 0m,
                supplier.OpeningBalance > 0 ? supplier.OpeningBalance : 0m,
                balance));

        foreach (var e in ordered)
        {
            balance += e.Credit - e.Debit;
            rows.Add(new SupplierLedgerEntryDto(e.Date, e.Type, e.Number, e.Id, e.Ref, e.Debit, e.Credit, balance));
        }

        return new SupplierLedgerDto(
            supplier.Id, supplier.Name,
            supplier.OpeningBalance, supplier.OpeningBalanceAsOf,
            rows.Sum(r => r.Debit), rows.Sum(r => r.Credit),
            balance, rows);
    }

    public async Task<IReadOnlyList<PayableDto>> GetPayablesAsync(CancellationToken ct = default)
    {
        var suppliers = await _db.Suppliers.OrderBy(s => s.Name)
            .Select(s => new { s.Id, s.Name, s.Phone, s.OpeningBalance }).ToListAsync(ct);

        var invoiceTotals = await _db.PurchaseInvoices
            .GroupBy(i => i.SupplierId)
            .Select(g => new { Id = g.Key, Total = g.Sum(x => x.Total), Paid = g.Sum(x => x.PaidAmount) })
            .ToDictionaryAsync(x => x.Id, ct);

        var paymentTotals = await _db.SupplierPayments
            .GroupBy(r => r.SupplierId)
            .Select(g => new { Id = g.Key, Total = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.Id, x => x.Total, ct);

        var returnTotals = await _db.PurchaseReturns
            .GroupBy(r => r.SupplierId)
            .Select(g => new { Id = g.Key, Total = g.Sum(x => x.Total) })
            .ToDictionaryAsync(x => x.Id, x => x.Total, ct);

        var result = new List<PayableDto>();
        foreach (var s in suppliers)
        {
            var invSummary = invoiceTotals.GetValueOrDefault(s.Id);
            decimal invoiced = invSummary?.Total ?? 0m;
            decimal paidAtPurchase = invSummary?.Paid ?? 0m;
            decimal paid = paymentTotals.GetValueOrDefault(s.Id);
            decimal returned = returnTotals.GetValueOrDefault(s.Id);

            var outstanding = s.OpeningBalance + invoiced - paidAtPurchase - paid - returned;
            result.Add(new PayableDto(s.Id, s.Name, s.Phone, s.OpeningBalance,
                invoiced, returned, paid + paidAtPurchase, outstanding));
        }
        return result.OrderByDescending(r => r.Outstanding).ToList();
    }
}
