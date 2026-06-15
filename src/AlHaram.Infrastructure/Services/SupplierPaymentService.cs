using AlHaram.Application.Common.Models;
using AlHaram.Application.Purchasing;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class SupplierPaymentService : ISupplierPaymentService
{
    private readonly AppDbContext _db;

    public SupplierPaymentService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<SupplierPaymentDto>> GetAllAsync(Guid? supplierId = null, CancellationToken ct = default)
    {
        var query = _db.SupplierPayments
            .Include(r => r.Supplier)
            .Include(r => r.PaymentAccount)
            .Include(r => r.Allocations).ThenInclude(a => a.PurchaseInvoice)
            .AsQueryable();

        if (supplierId is not null)
            query = query.Where(r => r.SupplierId == supplierId);

        var payments = await query
            .OrderByDescending(r => r.Date)
            .ThenByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

        return payments.Select(ToDto).ToList();
    }

    public async Task<SupplierPaymentDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var payment = await _db.SupplierPayments
            .Include(r => r.Supplier)
            .Include(r => r.PaymentAccount)
            .Include(r => r.Allocations).ThenInclude(a => a.PurchaseInvoice)
            .FirstOrDefaultAsync(r => r.Id == id, ct);
        return payment is null ? null : ToDto(payment);
    }

    public async Task<Result<SupplierPaymentDto>> CreateAsync(SaveSupplierPaymentRequest request, CancellationToken ct = default)
    {
        if (request.Amount <= 0) return Result<SupplierPaymentDto>.Failure("Amount must be greater than zero.");
        if (!await _db.Suppliers.AnyAsync(s => s.Id == request.SupplierId, ct))
            return Result<SupplierPaymentDto>.Failure("Supplier not found.");
        if (!await _db.PaymentAccounts.AnyAsync(p => p.Id == request.PaymentAccountId, ct))
            return Result<SupplierPaymentDto>.Failure("Payment account not found.");

        var allocs = request.Allocations ?? Array.Empty<SavePaymentAllocationRequest>();
        var allocSum = allocs.Sum(a => a.Amount);
        if (allocSum > request.Amount + 0.0049m)
            return Result<SupplierPaymentDto>.Failure("Allocations exceed payment amount.");
        if (allocs.Any(a => a.Amount <= 0))
            return Result<SupplierPaymentDto>.Failure("Allocation amounts must be greater than zero.");

        var errors = new List<string>();
        foreach (var a in allocs)
        {
            var invoice = await _db.PurchaseInvoices
                .Where(i => i.Id == a.PurchaseInvoiceId && i.SupplierId == request.SupplierId)
                .FirstOrDefaultAsync(ct);
            if (invoice is null) { errors.Add("An allocated invoice was not found for this supplier."); continue; }

            var already = await _db.PaymentAllocations
                .Where(x => x.PurchaseInvoiceId == invoice.Id)
                .SumAsync(x => (decimal?)x.Amount, ct) ?? 0m;
            var balance = invoice.Total - already - invoice.PaidAmount;
            if (a.Amount > balance + 0.0049m)
                errors.Add($"Allocation to invoice {invoice.Number} exceeds its outstanding balance ({balance:0.##}).");
        }
        if (errors.Count > 0) return Result<SupplierPaymentDto>.Failure(errors.Distinct().ToArray());

        var payment = new SupplierPayment
        {
            Number = await NextPaymentNumberAsync(ct),
            Date = request.Date,
            SupplierId = request.SupplierId,
            PaymentAccountId = request.PaymentAccountId,
            Mode = request.Mode,
            Amount = request.Amount,
            Reference = request.Reference,
            Notes = request.Notes
        };
        foreach (var a in allocs)
            payment.Allocations.Add(new PaymentAllocation
            {
                PurchaseInvoiceId = a.PurchaseInvoiceId,
                Amount = a.Amount
            });
        _db.SupplierPayments.Add(payment);

        _db.CashBankTransactions.Add(new CashBankTransaction
        {
            PaymentAccountId = request.PaymentAccountId,
            Date = request.Date,
            Source = CashBankSource.SupplierPayment,
            Amount = -request.Amount,
            SourceDocumentId = payment.Id,
            Reference = payment.Number
        });

        await _db.SaveChangesAsync(ct);

        var saved = await GetByIdAsync(payment.Id, ct);
        return Result<SupplierPaymentDto>.Success(saved!);
    }

    private async Task<string> NextPaymentNumberAsync(CancellationToken ct)
    {
        var count = await _db.SupplierPayments.IgnoreQueryFilters().CountAsync(ct);
        return $"PAY-{count + 1:D5}";
    }

    private static SupplierPaymentDto ToDto(SupplierPayment r)
    {
        var allocs = r.Allocations
            .Select(a => new PaymentAllocationDto(
                a.Id, a.PurchaseInvoiceId, a.PurchaseInvoice?.Number ?? string.Empty, a.Amount))
            .ToList();
        var allocated = allocs.Sum(x => x.Amount);
        return new SupplierPaymentDto(
            r.Id, r.Number, r.Date,
            r.SupplierId, r.Supplier?.Name ?? string.Empty,
            r.PaymentAccountId, r.PaymentAccount?.Name ?? string.Empty,
            r.Mode, r.Amount, allocated, r.Amount - allocated,
            r.Reference, r.Notes, allocs);
    }
}
