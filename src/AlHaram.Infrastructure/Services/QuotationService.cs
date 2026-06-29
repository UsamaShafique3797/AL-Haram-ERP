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

        if (string.IsNullOrWhiteSpace(request.CustomerName))
            return Result<QuotationDto>.Failure("Customer name is required.");

        var build = await BuildLinesAsync(request, ct);
        if (!build.Succeeded) return Result<QuotationDto>.Failure(build.Errors);

        var taxAmount = (build.Subtotal - request.Discount) * request.TaxRate / 100m;
        var total = build.Subtotal - request.Discount + taxAmount;

        var quote = new Quotation
        {
            Number = await NextNumberAsync(ct),
            Date = request.Date,
            ValidUntil = request.ValidUntil,
            CustomerName = request.CustomerName.Trim(),
            CustomerId = request.CustomerId,
            Status = QuotationStatus.Sent,
            Subtotal = build.Subtotal,
            Discount = request.Discount,
            TaxRate = request.TaxRate,
            TaxAmount = taxAmount,
            Total = total,
            Notes = request.Notes,
            Lines = build.Lines
        };
        _db.Quotations.Add(quote);
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("Created", "Quotation", quote.Id, quote.Number, null, null, ct);
        return Result<QuotationDto>.Success((await GetByIdAsync(quote.Id, ct))!);
    }

    private async Task<(bool Succeeded, string[] Errors, decimal Subtotal, List<QuotationLine> Lines)> BuildLinesAsync(
        SaveQuotationRequest request, CancellationToken ct)
    {
        var errors = new List<string>();
        decimal subtotal = 0m;
        var lines = new List<QuotationLine>();

        foreach (var line in request.Lines!)
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

        if (errors.Count > 0) return (false, errors.ToArray(), 0m, lines);
        if (lines.Count == 0) return (false, new[] { "Add at least one line." }, 0m, lines);
        return (true, Array.Empty<string>(), subtotal, lines);
    }

    public async Task<Result<QuotationDto>> UpdateAsync(Guid id, SaveQuotationRequest request, CancellationToken ct = default)
    {
        var quote = await _db.Quotations.Include(q => q.Lines).FirstOrDefaultAsync(q => q.Id == id, ct);
        if (quote is null) return Result<QuotationDto>.Failure("Quotation not found.");
        if (quote.Status == QuotationStatus.Converted)
            return Result<QuotationDto>.Failure("Converted quotations cannot be edited.");
        if (string.IsNullOrWhiteSpace(request.CustomerName))
            return Result<QuotationDto>.Failure("Customer name is required.");

        var build = await BuildLinesAsync(request, ct);
        if (!build.Succeeded) return Result<QuotationDto>.Failure(build.Errors);

        quote.Date = request.Date;
        quote.ValidUntil = request.ValidUntil;
        quote.CustomerName = request.CustomerName.Trim();
        quote.CustomerId = request.CustomerId;
        quote.Subtotal = build.Subtotal;
        quote.Discount = request.Discount;
        quote.TaxRate = request.TaxRate;
        quote.TaxAmount = (build.Subtotal - request.Discount) * request.TaxRate / 100m;
        quote.Total = build.Subtotal - request.Discount + quote.TaxAmount;
        quote.Notes = request.Notes;

        _db.QuotationLines.RemoveRange(quote.Lines);
        quote.Lines = build.Lines;

        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("Updated", "Quotation", quote.Id, quote.Number, null, null, ct);
        return Result<QuotationDto>.Success((await GetByIdAsync(id, ct))!);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var quote = await _db.Quotations.Include(q => q.Lines).FirstOrDefaultAsync(q => q.Id == id, ct);
        if (quote is null || quote.Status == QuotationStatus.Converted) return false;

        _db.QuotationLines.RemoveRange(quote.Lines);
        _db.Quotations.Remove(quote);
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("Deleted", "Quotation", id, quote.Number, null, null, ct);
        return true;
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
        new(q.Id, q.Number, q.Date, q.ValidUntil, q.CustomerId,
            !string.IsNullOrWhiteSpace(q.CustomerName) ? q.CustomerName : (q.Customer?.Name ?? string.Empty),
            q.Status, q.Subtotal, q.Discount, q.TaxRate, q.TaxAmount, q.Total,
            q.ConvertedSalesInvoiceId, q.ConvertedSalesInvoice?.Number, q.Notes,
            q.Lines.Select(l => new QuotationLineDto(
                l.Id, l.ItemId, l.Item?.Code ?? string.Empty, l.Item?.Name ?? string.Empty,
                l.UnitId, l.Unit?.Code ?? string.Empty, l.Quantity, l.ConversionFactor, l.BaseQuantity,
                l.Rate, l.Discount, l.LineTotal)).ToList());
}
