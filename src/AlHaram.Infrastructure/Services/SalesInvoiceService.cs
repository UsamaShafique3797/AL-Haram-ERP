using AlHaram.Application.Common.Models;
using AlHaram.Application.Sales;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class SalesInvoiceService : ISalesInvoiceService
{
    private readonly AppDbContext _db;

    public SalesInvoiceService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<SalesInvoiceDto>> GetAllAsync(Guid? customerId = null, CancellationToken ct = default)
    {
        var query = _db.SalesInvoices
            .Include(i => i.Customer)
            .Include(i => i.Godown)
            .Include(i => i.PaymentAccount)
            .Include(i => i.Lines).ThenInclude(l => l.Item)
            .Include(i => i.Lines).ThenInclude(l => l.Unit)
            .AsQueryable();

        if (customerId is not null)
            query = query.Where(i => i.CustomerId == customerId);

        var invoices = await query
            .OrderByDescending(i => i.Date)
            .ThenByDescending(i => i.CreatedAt)
            .ToListAsync(ct);

        var allocations = await _db.ReceiptAllocations
            .Where(a => invoices.Select(i => i.Id).Contains(a.SalesInvoiceId))
            .GroupBy(a => a.SalesInvoiceId)
            .Select(g => new { Id = g.Key, Total = g.Sum(a => a.Amount) })
            .ToDictionaryAsync(x => x.Id, x => x.Total, ct);

        return invoices.Select(i => ToDto(i, allocations.GetValueOrDefault(i.Id))).ToList();
    }

    public async Task<SalesInvoiceDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var invoice = await _db.SalesInvoices
            .Include(i => i.Customer)
            .Include(i => i.Godown)
            .Include(i => i.PaymentAccount)
            .Include(i => i.Lines).ThenInclude(l => l.Item)
            .Include(i => i.Lines).ThenInclude(l => l.Unit)
            .FirstOrDefaultAsync(i => i.Id == id, ct);
        if (invoice is null) return null;

        var allocated = await _db.ReceiptAllocations
            .Where(a => a.SalesInvoiceId == id)
            .SumAsync(a => (decimal?)a.Amount, ct) ?? 0m;
        return ToDto(invoice, allocated);
    }

    public async Task<IReadOnlyList<OpenInvoiceDto>> GetOpenInvoicesAsync(Guid customerId, CancellationToken ct = default)
    {
        var invoices = await _db.SalesInvoices
            .Where(i => i.CustomerId == customerId && i.Status == SalesDocStatus.Posted)
            .OrderBy(i => i.Date)
            .Select(i => new { i.Id, i.Number, i.Date, i.Total, i.PaidAmount })
            .ToListAsync(ct);

        var allocations = await _db.ReceiptAllocations
            .Where(a => invoices.Select(i => i.Id).Contains(a.SalesInvoiceId))
            .GroupBy(a => a.SalesInvoiceId)
            .Select(g => new { Id = g.Key, Total = g.Sum(a => a.Amount) })
            .ToDictionaryAsync(x => x.Id, x => x.Total, ct);

        return invoices
            .Select(i =>
            {
                var allocated = allocations.GetValueOrDefault(i.Id) + i.PaidAmount;
                return new { i.Id, i.Number, i.Date, i.Total, Allocated = allocated, Balance = i.Total - allocated };
            })
            .Where(x => x.Balance > 0.0049m)
            .Select(x => new OpenInvoiceDto(x.Id, x.Number, x.Date, x.Total, x.Allocated, x.Balance))
            .ToList();
    }

    public async Task<Result<SalesInvoiceDto>> CreateAsync(SaveSalesInvoiceRequest request, CancellationToken ct = default)
    {
        if (request.Lines is null || request.Lines.Count == 0)
            return Result<SalesInvoiceDto>.Failure("Add at least one line.");

        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == request.CustomerId, ct);
        if (customer is null) return Result<SalesInvoiceDto>.Failure("Customer not found.");
        if (!await _db.Godowns.AnyAsync(g => g.Id == request.GodownId, ct))
            return Result<SalesInvoiceDto>.Failure("Godown not found.");

        var errors = new List<string>();
        var lineCalcs = new List<LineCalc>();

        foreach (var line in request.Lines)
        {
            if (line.Quantity <= 0) { errors.Add("Quantity must be greater than zero on every line."); continue; }
            if (line.Rate < 0) { errors.Add("Rate cannot be negative."); continue; }

            var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == line.ItemId, ct);
            if (item is null) { errors.Add("A selected item does not exist."); continue; }

            var itemUnit = await _db.ItemUnits.FirstOrDefaultAsync(
                u => u.ItemId == line.ItemId && u.UnitId == line.UnitId, ct);
            var conversion = itemUnit?.ConversionFactor ?? (line.UnitId == item.BaseUnitId ? 1m : 0m);
            if (conversion <= 0)
            {
                errors.Add($"Unit not configured for item '{item.Name}'.");
                continue;
            }

            var baseQty = line.Quantity * conversion;

            if (item.TrackInventory)
            {
                var onHand = await _db.StockItems
                    .Where(s => s.ItemId == item.Id && s.GodownId == request.GodownId)
                    .Select(s => (decimal?)s.Quantity).FirstOrDefaultAsync(ct) ?? 0m;
                if (baseQty > onHand)
                {
                    errors.Add($"Not enough stock for '{item.Name}': need {baseQty} {item.BaseUnit?.Code ?? ""}, on hand {onHand}.");
                    continue;
                }
            }

            lineCalcs.Add(new LineCalc(
                Item: item,
                UnitId: line.UnitId,
                Quantity: line.Quantity,
                Conversion: conversion,
                BaseQuantity: baseQty,
                Rate: line.Rate,
                Discount: line.Discount,
                LineTotal: line.Quantity * line.Rate - line.Discount));
        }

        if (errors.Count > 0)
            return Result<SalesInvoiceDto>.Failure(errors.Distinct().ToArray());

        var subtotal = lineCalcs.Sum(l => l.LineTotal);
        var discount = request.Discount;
        var taxAmount = Math.Round((subtotal - discount) * request.TaxRate / 100m, 4);
        var total = subtotal - discount + taxAmount;

        if (request.PaidAmount < 0) return Result<SalesInvoiceDto>.Failure("Paid amount cannot be negative.");
        if (request.PaidAmount > total + 0.0049m)
            return Result<SalesInvoiceDto>.Failure("Paid amount cannot exceed invoice total.");
        if (request.PaidAmount > 0 && request.PaymentAccountId is null)
            return Result<SalesInvoiceDto>.Failure("Select a payment account for the paid amount.");

        var invoice = new SalesInvoice
        {
            Number = await NextInvoiceNumberAsync(ct),
            Date = request.Date,
            CustomerId = request.CustomerId,
            GodownId = request.GodownId,
            Status = SalesDocStatus.Posted,
            Subtotal = subtotal,
            Discount = discount,
            TaxRate = request.TaxRate,
            TaxAmount = taxAmount,
            Total = total,
            PaidAmount = request.PaidAmount,
            PaymentAccountId = request.PaidAmount > 0 ? request.PaymentAccountId : null,
            Notes = request.Notes
        };
        _db.SalesInvoices.Add(invoice);

        decimal cogs = 0m;

        foreach (var l in lineCalcs)
        {
            var movement = await ApplyStockOutAsync(
                l.Item.Id, request.GodownId, MovementType.Sale, l.BaseQuantity,
                request.Date, invoice.Number, l.Item.TrackInventory, ct);
            var unitCost = movement?.UnitCost ?? 0m;
            var lineCost = unitCost * l.BaseQuantity;
            cogs += lineCost;

            invoice.Lines.Add(new SalesInvoiceLine
            {
                ItemId = l.Item.Id,
                UnitId = l.UnitId,
                Quantity = l.Quantity,
                ConversionFactor = l.Conversion,
                BaseQuantity = l.BaseQuantity,
                Rate = l.Rate,
                Discount = l.Discount,
                LineTotal = l.LineTotal,
                UnitCost = unitCost,
                LineCost = lineCost
            });
        }

        invoice.CostOfGoodsSold = cogs;

        if (request.PaidAmount > 0 && request.PaymentAccountId is { } accountId)
        {
            _db.CashBankTransactions.Add(new CashBankTransaction
            {
                PaymentAccountId = accountId,
                Date = request.Date,
                Source = CashBankSource.CashSale,
                Amount = request.PaidAmount,
                SourceDocumentId = invoice.Id,
                Reference = invoice.Number
            });
        }

        await _db.SaveChangesAsync(ct);
        var saved = await GetByIdAsync(invoice.Id, ct);
        return Result<SalesInvoiceDto>.Success(saved!);
    }

    // ---- helpers ------------------------------------------------------------

    private async Task<StockMovement?> ApplyStockOutAsync(
        Guid itemId, Guid godownId, MovementType type, decimal baseQty,
        DateTime date, string reference, bool trackInventory, CancellationToken ct)
    {
        if (!trackInventory) return null;

        var stockItem = await _db.StockItems
            .FirstOrDefaultAsync(s => s.ItemId == itemId && s.GodownId == godownId, ct);
        if (stockItem is null)
        {
            stockItem = new StockItem { ItemId = itemId, GodownId = godownId, Quantity = 0m, AverageCost = 0m };
            _db.StockItems.Add(stockItem);
        }

        var unitCost = stockItem.AverageCost;
        stockItem.Quantity -= baseQty;

        var movement = new StockMovement
        {
            ItemId = itemId,
            GodownId = godownId,
            Type = type,
            Date = date,
            Quantity = -baseQty,
            UnitCost = unitCost,
            QuantityAfter = stockItem.Quantity,
            AverageCostAfter = stockItem.AverageCost,
            Reference = reference
        };
        _db.StockMovements.Add(movement);
        return movement;
    }

    private async Task<string> NextInvoiceNumberAsync(CancellationToken ct)
    {
        var count = await _db.SalesInvoices.IgnoreQueryFilters().CountAsync(ct);
        return $"INV-{count + 1:D5}";
    }

    private static SalesInvoiceDto ToDto(SalesInvoice i, decimal receiptsAllocated)
    {
        var allocatedTotal = receiptsAllocated + i.PaidAmount;
        return new SalesInvoiceDto(
            i.Id, i.Number, i.Date,
            i.CustomerId, i.Customer?.Name ?? string.Empty,
            i.GodownId, i.Godown?.Name ?? string.Empty,
            i.Status,
            i.Subtotal, i.Discount, i.TaxRate, i.TaxAmount, i.Total,
            i.PaidAmount, allocatedTotal, i.Total - allocatedTotal,
            i.PaymentAccountId, i.PaymentAccount?.Name,
            i.CostOfGoodsSold, i.Notes,
            i.Lines.Select(l => new SalesInvoiceLineDto(
                l.Id, l.ItemId, l.Item?.Code ?? string.Empty, l.Item?.Name ?? string.Empty,
                l.UnitId, l.Unit?.Code ?? string.Empty,
                l.Quantity, l.ConversionFactor, l.BaseQuantity,
                l.Rate, l.Discount, l.LineTotal, l.UnitCost, l.LineCost)).ToList());
    }

    private sealed record LineCalc(
        Item Item, Guid UnitId, decimal Quantity, decimal Conversion,
        decimal BaseQuantity, decimal Rate, decimal Discount, decimal LineTotal);
}
