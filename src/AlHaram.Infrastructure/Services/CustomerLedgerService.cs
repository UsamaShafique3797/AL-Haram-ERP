using AlHaram.Application.Common;
using AlHaram.Application.Sales;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class CustomerLedgerService : ICustomerLedgerService
{
    private readonly AppDbContext _db;
    private readonly IBranchScope _branch;

    public CustomerLedgerService(AppDbContext db, IBranchScope branch)
    {
        _db = db;
        _branch = branch;
    }

    public async Task<CustomerLedgerDto> GetLedgerAsync(Guid customerId, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == customerId, ct)
            ?? throw new InvalidOperationException("Customer not found.");

        var invoices = await _db.SalesInvoices
            .Where(i => i.CustomerId == customerId)
            .ForBranch(_branch)
            .Select(i => new { i.Id, i.Number, i.Date, i.Total, i.PaidAmount })
            .ToListAsync(ct);

        var receipts = await _db.CustomerReceipts
            .Include(r => r.PaymentAccount)
            .Where(r => r.CustomerId == customerId)
            .Select(r => new { r.Id, r.Number, r.Date, r.Amount, PayAcc = r.PaymentAccount!.Name })
            .ToListAsync(ct);

        var returns = await _db.SalesReturns
            .Where(r => r.CustomerId == customerId)
            .ForBranch(_branch)
            .Select(r => new { r.Id, r.Number, r.Date, r.Total, InvoiceNumber = r.SalesInvoice!.Number })
            .ToListAsync(ct);

        var entries = new List<(DateTime Date, string Type, string Number, Guid? Id, string? Ref, decimal Debit, decimal Credit)>();

        foreach (var i in invoices)
        {
            entries.Add((i.Date, "Invoice", i.Number, i.Id, null, i.Total, 0m));
            if (i.PaidAmount > 0)
                entries.Add((i.Date, "Cash sale paid", i.Number, i.Id, "Paid at counter", 0m, i.PaidAmount));
        }
        foreach (var r in receipts)
            entries.Add((r.Date, "Receipt", r.Number, r.Id, r.PayAcc, 0m, r.Amount));
        foreach (var r in returns)
            entries.Add((r.Date, "Sales return", r.Number, r.Id, r.InvoiceNumber, 0m, r.Total));

        var ordered = entries
            .OrderBy(e => e.Date)
            .ThenBy(e => e.Type == "Invoice" ? 0 : 1)
            .ToList();

        var rows = new List<CustomerLedgerEntryDto>();
        var opening = _branch.EffectiveGodownId is null ? customer.OpeningBalance : 0m;
        var balance = opening;

        if (opening != 0)
            rows.Add(new CustomerLedgerEntryDto(
                customer.OpeningBalanceAsOf ?? customer.CreatedAt,
                "Opening balance", "—", null, null,
                opening > 0 ? opening : 0m,
                opening < 0 ? -opening : 0m,
                balance));

        foreach (var e in ordered)
        {
            balance += e.Debit - e.Credit;
            rows.Add(new CustomerLedgerEntryDto(e.Date, e.Type, e.Number, e.Id, e.Ref, e.Debit, e.Credit, balance));
        }

        return new CustomerLedgerDto(
            customer.Id, customer.Name,
            opening, customer.OpeningBalanceAsOf,
            rows.Sum(r => r.Debit), rows.Sum(r => r.Credit),
            balance, rows);
    }

    public async Task<IReadOnlyList<ReceivableDto>> GetReceivablesAsync(CancellationToken ct = default)
    {
        var customers = await _db.Customers.OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name, c.Phone, c.OpeningBalance }).ToListAsync(ct);

        var invoiceTotals = await _db.SalesInvoices
            .ForBranch(_branch)
            .GroupBy(i => i.CustomerId)
            .Select(g => new { Id = g.Key, Total = g.Sum(x => x.Total), Paid = g.Sum(x => x.PaidAmount) })
            .ToDictionaryAsync(x => x.Id, ct);

        var receiptTotals = await _db.CustomerReceipts
            .GroupBy(r => r.CustomerId)
            .Select(g => new { Id = g.Key, Total = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.Id, x => x.Total, ct);

        var returnTotals = await _db.SalesReturns
            .ForBranch(_branch)
            .GroupBy(r => r.CustomerId)
            .Select(g => new { Id = g.Key, Total = g.Sum(x => x.Total) })
            .ToDictionaryAsync(x => x.Id, x => x.Total, ct);

        var branchScoped = _branch.EffectiveGodownId is not null;
        var result = new List<ReceivableDto>();
        foreach (var c in customers)
        {
            var invSummary = invoiceTotals.GetValueOrDefault(c.Id);
            decimal invoiced = invSummary?.Total ?? 0m;
            decimal paidAtSale = invSummary?.Paid ?? 0m;
            decimal received = branchScoped ? 0m : receiptTotals.GetValueOrDefault(c.Id);
            decimal returned = returnTotals.GetValueOrDefault(c.Id);
            var opening = branchScoped ? 0m : c.OpeningBalance;

            var outstanding = opening + invoiced - paidAtSale - received - returned;
            if (branchScoped && outstanding <= 0.0049m && invoiced == 0m) continue;

            result.Add(new ReceivableDto(c.Id, c.Name, c.Phone, opening,
                invoiced, returned, received + paidAtSale, outstanding));
        }
        return result.OrderByDescending(r => r.Outstanding).ToList();
    }
}
