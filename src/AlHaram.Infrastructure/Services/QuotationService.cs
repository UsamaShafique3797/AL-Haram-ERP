using AlHaram.Application.Common;
using AlHaram.Application.Common.Models;
using AlHaram.Application.Sales;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class QuotationService : IQuotationService
{
    private readonly AppDbContext _db;
    private readonly ISalesInvoiceService _salesInvoices;
    private readonly IAuditLogService _audit;

    public QuotationService(AppDbContext db, ISalesInvoiceService salesInvoices, IAuditLogService audit)
    {
        _db = db;
        _salesInvoices = salesInvoices;
        _audit = audit;
    }

    public async Task<IReadOnlyList<QuotationDto>> GetAllAsync(Guid? customerId = null, CancellationToken ct = default)
    {
        var query = _db.Quotations
            .Include(q => q.Customer)
            .Include(q => q.ConvertedSalesInvoice)
            .Include(q => q.Lines).ThenInclude(l => l.Item)
            .Include(q => q.Lines).ThenInclude(l => l.Unit)
            .AsQueryable();

        if (customerId is not null)
            query = query.Where(q => q.CustomerId == customerId);

        var list = await query.OrderByDescending(q => q.Date).ThenByDescending(q => q.CreatedAt).ToListAsync(ct);
        return list.Select(ToDto).ToList();
    }

    public async Task<QuotationDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var quote = await _db.Quotations
            .Include(q => q.Customer)
            .Include(q => q.ConvertedSalesInvoice)
            .Include(q => q.Lines).ThenInclude(l => l.Item)
            .Include(q => q.Lines).ThenInclude(l => l.Unit)
            .FirstOrDefaultAsync(q => q.Id == id, ct);
        return quote is null ? null : ToDto(quote);
    }

    public async Task<Result<QuotationDto>> CreateAsync(SaveQuotationRequest request, CancellationToken ct = default)
    {
        if (request.Lines is null || request.Lines.Count == 0)
            return Result<QuotationDto>.Failure("Add at least one line.");

        if (!await _db.Customers.AnyAsync(c => c.Id == request.CustomerId, ct))
            return Result<QuotationDto>.Failure("Customer not found.");

        var errors = new List<string>();
        decimal subtotal = 0m;
        var lines = new List<QuotationLine>();

        foreach (var line in request.Lines)
        {
            if (line.Quantity <= 0) { errors.Add("Quantity must be greater than zero."); continue; }
            if (line.Rate < 0) { errors.Add("Rate cannot be negative."); continue; }

            var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == line.ItemId, ct);
            if (item is null) { errors.Add("A selected item does not exist."); continue; }

            var itemUnit = await _db.ItemUnits.FirstOrDefaultAsync(u => u.ItemId == line.ItemId && u.UnitId == line.UnitId, ct);
            var factor = itemUnit?.ConversionFactor ?? (line.UnitId == item.BaseUnitId ? 1m : 0m);
            if (factor <= 0) { errors.Add($"Unit not configured for item '{item.Name}'."); continue; }

            var lineTotal = line.Quantity * line.Rate - line.Discount;
            subtotal += lineTotal;
            lines.Add(new QuotationLine
            {
                ItemId = line.ItemId,
                UnitId = line.UnitId,
                Quantity = line.Quantity,
                ConversionFactor = factor,
                BaseQuantity = line.Quantity * factor,
                Rate = line.Rate,
                Discount = line.Discount,
                LineTotal = lineTotal
            });
        }

        if (errors.Count > 0) return Result<QuotationDto>.Failure(errors.ToArray());

        var taxAmount = (subtotal - request.Discount) * request.TaxRate / 100m;
        var total = subtotal - request.Discount + taxAmount;

        var quote = new Quotation
        {
            Number = await NextNumberAsync(ct),
            Date = request.Date,
            ValidUntil = request.ValidUntil,
            CustomerId = request.CustomerId,
            Status = QuotationStatus.Sent,
            Subtotal = subtotal,
            Discount = request.Discount,
            TaxRate = request.TaxRate,
            TaxAmount = taxAmount,
            Total = total,
            Notes = request.Notes,
            Lines = lines
        };
        _db.Quotations.Add(quote);
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("Created", "Quotation", quote.Id, quote.Number, null, null, ct);
        return Result<QuotationDto>.Success((await GetByIdAsync(quote.Id, ct))!);
    }

    public async Task<Result<SalesInvoiceDto>> ConvertToInvoiceAsync(Guid id, SaveSalesInvoiceRequest request, CancellationToken ct = default)
    {
        var quote = await _db.Quotations.FirstOrDefaultAsync(q => q.Id == id, ct);
        if (quote is null) return Result<SalesInvoiceDto>.Failure("Quotation not found.");
        if (quote.Status == QuotationStatus.Converted)
            return Result<SalesInvoiceDto>.Failure("Quotation already converted.");

        var invoiceResult = await _salesInvoices.CreateAsync(request, ct);
        if (!invoiceResult.Succeeded) return invoiceResult;

        quote.Status = QuotationStatus.Converted;
        quote.ConvertedSalesInvoiceId = invoiceResult.Data!.Id;
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("Converted", "Quotation", quote.Id, quote.Number, null, invoiceResult.Data.Number, ct);
        return invoiceResult;
    }

    private async Task<string> NextNumberAsync(CancellationToken ct)
    {
        var count = await _db.Quotations.IgnoreQueryFilters().CountAsync(ct);
        return $"QT-{count + 1:D5}";
    }

    private static QuotationDto ToDto(Quotation q) =>
        new(q.Id, q.Number, q.Date, q.ValidUntil, q.CustomerId, q.Customer?.Name ?? string.Empty,
            q.Status, q.Subtotal, q.Discount, q.TaxRate, q.TaxAmount, q.Total,
            q.ConvertedSalesInvoiceId, q.ConvertedSalesInvoice?.Number, q.Notes,
            q.Lines.Select(l => new QuotationLineDto(
                l.Id, l.ItemId, l.Item?.Code ?? string.Empty, l.Item?.Name ?? string.Empty,
                l.UnitId, l.Unit?.Code ?? string.Empty, l.Quantity, l.ConversionFactor, l.BaseQuantity,
                l.Rate, l.Discount, l.LineTotal)).ToList());
}
