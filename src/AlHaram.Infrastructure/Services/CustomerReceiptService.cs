using AlHaram.Application.Common.Models;
using AlHaram.Application.Sales;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class CustomerReceiptService : ICustomerReceiptService
{
    private readonly AppDbContext _db;

    public CustomerReceiptService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<CustomerReceiptDto>> GetAllAsync(Guid? customerId = null, CancellationToken ct = default)
    {
        var query = _db.CustomerReceipts
            .Include(r => r.Customer)
            .Include(r => r.PaymentAccount)
            .Include(r => r.Allocations).ThenInclude(a => a.SalesInvoice)
            .AsQueryable();

        if (customerId is not null)
            query = query.Where(r => r.CustomerId == customerId);

        var receipts = await query
            .OrderByDescending(r => r.Date)
            .ThenByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

        return receipts.Select(ToDto).ToList();
    }

    public async Task<CustomerReceiptDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var receipt = await _db.CustomerReceipts
            .Include(r => r.Customer)
            .Include(r => r.PaymentAccount)
            .Include(r => r.Allocations).ThenInclude(a => a.SalesInvoice)
            .FirstOrDefaultAsync(r => r.Id == id, ct);
        return receipt is null ? null : ToDto(receipt);
    }

    public async Task<Result<CustomerReceiptDto>> CreateAsync(SaveCustomerReceiptRequest request, CancellationToken ct = default)
    {
        if (request.Amount <= 0) return Result<CustomerReceiptDto>.Failure("Amount must be greater than zero.");
        if (!await _db.Customers.AnyAsync(c => c.Id == request.CustomerId, ct))
            return Result<CustomerReceiptDto>.Failure("Customer not found.");
        if (!await _db.PaymentAccounts.AnyAsync(p => p.Id == request.PaymentAccountId, ct))
            return Result<CustomerReceiptDto>.Failure("Payment account not found.");

        var allocs = request.Allocations ?? Array.Empty<SaveReceiptAllocationRequest>();
        var allocSum = allocs.Sum(a => a.Amount);
        if (allocSum > request.Amount + 0.0049m)
            return Result<CustomerReceiptDto>.Failure("Allocations exceed receipt amount.");
        if (allocs.Any(a => a.Amount <= 0))
            return Result<CustomerReceiptDto>.Failure("Allocation amounts must be greater than zero.");

        var errors = new List<string>();
        foreach (var a in allocs)
        {
            var invoice = await _db.SalesInvoices
                .Where(i => i.Id == a.SalesInvoiceId && i.CustomerId == request.CustomerId)
                .FirstOrDefaultAsync(ct);
            if (invoice is null) { errors.Add("An allocated invoice was not found for this customer."); continue; }

            var already = await _db.ReceiptAllocations
                .Where(x => x.SalesInvoiceId == invoice.Id)
                .SumAsync(x => (decimal?)x.Amount, ct) ?? 0m;
            var balance = invoice.Total - already - invoice.PaidAmount;
            if (a.Amount > balance + 0.0049m)
                errors.Add($"Allocation to invoice {invoice.Number} exceeds its outstanding balance ({balance:0.##}).");
        }
        if (errors.Count > 0) return Result<CustomerReceiptDto>.Failure(errors.Distinct().ToArray());

        var receipt = new CustomerReceipt
        {
            Number = await NextReceiptNumberAsync(ct),
            Date = request.Date,
            CustomerId = request.CustomerId,
            PaymentAccountId = request.PaymentAccountId,
            Mode = request.Mode,
            Amount = request.Amount,
            Reference = request.Reference,
            Notes = request.Notes
        };
        foreach (var a in allocs)
            receipt.Allocations.Add(new ReceiptAllocation
            {
                SalesInvoiceId = a.SalesInvoiceId,
                Amount = a.Amount
            });
        _db.CustomerReceipts.Add(receipt);

        _db.CashBankTransactions.Add(new CashBankTransaction
        {
            PaymentAccountId = request.PaymentAccountId,
            Date = request.Date,
            Source = CashBankSource.SalesReceipt,
            Amount = request.Amount,
            SourceDocumentId = receipt.Id,
            Reference = receipt.Number
        });

        await _db.SaveChangesAsync(ct);

        var saved = await GetByIdAsync(receipt.Id, ct);
        return Result<CustomerReceiptDto>.Success(saved!);
    }

    private async Task<string> NextReceiptNumberAsync(CancellationToken ct)
    {
        var count = await _db.CustomerReceipts.IgnoreQueryFilters().CountAsync(ct);
        return $"RCT-{count + 1:D5}";
    }

    private static CustomerReceiptDto ToDto(CustomerReceipt r)
    {
        var allocs = r.Allocations
            .Select(a => new ReceiptAllocationDto(
                a.Id, a.SalesInvoiceId, a.SalesInvoice?.Number ?? string.Empty, a.Amount))
            .ToList();
        var allocated = allocs.Sum(x => x.Amount);
        return new CustomerReceiptDto(
            r.Id, r.Number, r.Date,
            r.CustomerId, r.Customer?.Name ?? string.Empty,
            r.PaymentAccountId, r.PaymentAccount?.Name ?? string.Empty,
            r.Mode, r.Amount, allocated, r.Amount - allocated,
            r.Reference, r.Notes, allocs);
    }
}
