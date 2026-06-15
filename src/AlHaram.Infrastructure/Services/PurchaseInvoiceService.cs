using AlHaram.Application.Common.Models;
using AlHaram.Application.Purchasing;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class PurchaseInvoiceService : IPurchaseInvoiceService
{
    private readonly AppDbContext _db;

    public PurchaseInvoiceService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<PurchaseInvoiceDto>> GetAllAsync(Guid? supplierId = null, CancellationToken ct = default)
    {
        var query = _db.PurchaseInvoices
            .Include(i => i.Supplier)
            .Include(i => i.Godown)
            .Include(i => i.PaymentAccount)
            .Include(i => i.Lines).ThenInclude(l => l.Item)
            .Include(i => i.Lines).ThenInclude(l => l.Unit)
            .AsQueryable();

        if (supplierId is not null)
            query = query.Where(i => i.SupplierId == supplierId);

        var invoices = await query
            .OrderByDescending(i => i.Date)
            .ThenByDescending(i => i.CreatedAt)
            .ToListAsync(ct);

        var allocations = await _db.PaymentAllocations
            .Where(a => invoices.Select(i => i.Id).Contains(a.PurchaseInvoiceId))
            .GroupBy(a => a.PurchaseInvoiceId)
            .Select(g => new { Id = g.Key, Total = g.Sum(a => a.Amount) })
            .ToDictionaryAsync(x => x.Id, x => x.Total, ct);

        return invoices.Select(i => ToDto(i, allocations.GetValueOrDefault(i.Id))).ToList();
    }

    public async Task<PurchaseInvoiceDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var invoice = await _db.PurchaseInvoices
            .Include(i => i.Supplier)
            .Include(i => i.Godown)
            .Include(i => i.PaymentAccount)
            .Include(i => i.Lines).ThenInclude(l => l.Item)
            .Include(i => i.Lines).ThenInclude(l => l.Unit)
            .FirstOrDefaultAsync(i => i.Id == id, ct);
        if (invoice is null) return null;

        var allocated = await _db.PaymentAllocations
            .Where(a => a.PurchaseInvoiceId == id)
            .SumAsync(a => (decimal?)a.Amount, ct) ?? 0m;
        return ToDto(invoice, allocated);
    }

    public async Task<IReadOnlyList<OpenPurchaseInvoiceDto>> GetOpenInvoicesAsync(Guid supplierId, CancellationToken ct = default)
    {
        var invoices = await _db.PurchaseInvoices
            .Where(i => i.SupplierId == supplierId && i.Status == PurchaseDocStatus.Posted)
            .OrderBy(i => i.Date)
            .Select(i => new { i.Id, i.Number, i.Date, i.Total, i.PaidAmount })
            .ToListAsync(ct);

        var allocations = await _db.PaymentAllocations
            .Where(a => invoices.Select(i => i.Id).Contains(a.PurchaseInvoiceId))
            .GroupBy(a => a.PurchaseInvoiceId)
            .Select(g => new { Id = g.Key, Total = g.Sum(a => a.Amount) })
            .ToDictionaryAsync(x => x.Id, x => x.Total, ct);

        return invoices
            .Select(i =>
            {
                var allocated = allocations.GetValueOrDefault(i.Id) + i.PaidAmount;
                return new { i.Id, i.Number, i.Date, i.Total, Allocated = allocated, Balance = i.Total - allocated };
            })
            .Where(x => x.Balance > 0.0049m)
            .Select(x => new OpenPurchaseInvoiceDto(x.Id, x.Number, x.Date, x.Total, x.Allocated, x.Balance))
            .ToList();
    }

    public async Task<Result<PurchaseInvoiceDto>> CreateAsync(SavePurchaseInvoiceRequest request, CancellationToken ct = default)
    {
        if (request.Lines is null || request.Lines.Count == 0)
            return Result<PurchaseInvoiceDto>.Failure("Add at least one line.");

        var supplier = await _db.Suppliers.FirstOrDefaultAsync(s => s.Id == request.SupplierId, ct);
        if (supplier is null) return Result<PurchaseInvoiceDto>.Failure("Supplier not found.");
        if (!await _db.Godowns.AnyAsync(g => g.Id == request.GodownId, ct))
            return Result<PurchaseInvoiceDto>.Failure("Godown not found.");

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
            var unitCost = conversion > 0 ? line.Rate / conversion : line.Rate;

            lineCalcs.Add(new LineCalc(
                Item: item,
                UnitId: line.UnitId,
                Quantity: line.Quantity,
                Conversion: conversion,
                BaseQuantity: baseQty,
                Rate: line.Rate,
                Discount: line.Discount,
                LineTotal: line.Quantity * line.Rate - line.Discount,
                UnitCost: unitCost));
        }

        if (errors.Count > 0)
            return Result<PurchaseInvoiceDto>.Failure(errors.Distinct().ToArray());

        var subtotal = lineCalcs.Sum(l => l.LineTotal);
        var discount = request.Discount;
        var taxAmount = Math.Round((subtotal - discount) * request.TaxRate / 100m, 4);
        var total = subtotal - discount + taxAmount;

        if (request.PaidAmount < 0) return Result<PurchaseInvoiceDto>.Failure("Paid amount cannot be negative.");
        if (request.PaidAmount > total + 0.0049m)
            return Result<PurchaseInvoiceDto>.Failure("Paid amount cannot exceed invoice total.");
        if (request.PaidAmount > 0 && request.PaymentAccountId is null)
            return Result<PurchaseInvoiceDto>.Failure("Select a payment account for the paid amount.");

        var invoice = new PurchaseInvoice
        {
            Number = await NextInvoiceNumberAsync(ct),
            Date = request.Date,
            SupplierId = request.SupplierId,
            GodownId = request.GodownId,
            Status = PurchaseDocStatus.Posted,
            Subtotal = subtotal,
            Discount = discount,
            TaxRate = request.TaxRate,
            TaxAmount = taxAmount,
            Total = total,
            PaidAmount = request.PaidAmount,
            PaymentAccountId = request.PaidAmount > 0 ? request.PaymentAccountId : null,
            Notes = request.Notes
        };
        _db.PurchaseInvoices.Add(invoice);

        foreach (var l in lineCalcs)
        {
            if (l.Item.TrackInventory)
            {
                await ApplyStockInAsync(
                    l.Item.Id, request.GodownId, MovementType.Purchase, l.BaseQuantity,
                    l.UnitCost, request.Date, invoice.Number, ct);
            }

            invoice.Lines.Add(new PurchaseInvoiceLine
            {
                ItemId = l.Item.Id,
                UnitId = l.UnitId,
                Quantity = l.Quantity,
                ConversionFactor = l.Conversion,
                BaseQuantity = l.BaseQuantity,
                Rate = l.Rate,
                Discount = l.Discount,
                LineTotal = l.LineTotal,
                UnitCost = l.UnitCost,
                LineCost = l.UnitCost * l.BaseQuantity
            });
        }

        if (request.PaidAmount > 0 && request.PaymentAccountId is { } accountId)
        {
            _db.CashBankTransactions.Add(new CashBankTransaction
            {
                PaymentAccountId = accountId,
                Date = request.Date,
                Source = CashBankSource.SupplierPayment,
                Amount = -request.PaidAmount,
                SourceDocumentId = invoice.Id,
                Reference = invoice.Number
            });
        }

        await _db.SaveChangesAsync(ct);
        var saved = await GetByIdAsync(invoice.Id, ct);
        return Result<PurchaseInvoiceDto>.Success(saved!);
    }

    private async Task ApplyStockInAsync(
        Guid itemId, Guid godownId, MovementType type, decimal baseQty,
        decimal unitCost, DateTime date, string reference, CancellationToken ct)
    {
        var stockItem = await _db.StockItems
            .FirstOrDefaultAsync(s => s.ItemId == itemId && s.GodownId == godownId, ct);

        if (stockItem is null)
        {
            stockItem = new StockItem { ItemId = itemId, GodownId = godownId, Quantity = 0m, AverageCost = 0m };
            _db.StockItems.Add(stockItem);
        }

        var newQty = stockItem.Quantity + baseQty;
        var newValue = (stockItem.Quantity * stockItem.AverageCost) + (baseQty * unitCost);
        stockItem.AverageCost = newQty > 0 ? newValue / newQty : unitCost;
        stockItem.Quantity = newQty;

        _db.StockMovements.Add(new StockMovement
        {
            ItemId = itemId,
            GodownId = godownId,
            Type = type,
            Date = date,
            Quantity = baseQty,
            UnitCost = unitCost,
            QuantityAfter = stockItem.Quantity,
            AverageCostAfter = stockItem.AverageCost,
            Reference = reference
        });
    }

    private async Task<string> NextInvoiceNumberAsync(CancellationToken ct)
    {
        var count = await _db.PurchaseInvoices.IgnoreQueryFilters().CountAsync(ct);
        return $"PINV-{count + 1:D5}";
    }

    private static PurchaseInvoiceDto ToDto(PurchaseInvoice i, decimal paymentsAllocated)
    {
        var allocatedTotal = paymentsAllocated + i.PaidAmount;
        return new PurchaseInvoiceDto(
            i.Id, i.Number, i.Date,
            i.SupplierId, i.Supplier?.Name ?? string.Empty,
            i.GodownId, i.Godown?.Name ?? string.Empty,
            i.Status,
            i.Subtotal, i.Discount, i.TaxRate, i.TaxAmount, i.Total,
            i.PaidAmount, allocatedTotal, i.Total - allocatedTotal,
            i.PaymentAccountId, i.PaymentAccount?.Name,
            i.Notes,
            i.Lines.Select(l => new PurchaseInvoiceLineDto(
                l.Id, l.ItemId, l.Item?.Code ?? string.Empty, l.Item?.Name ?? string.Empty,
                l.UnitId, l.Unit?.Code ?? string.Empty,
                l.Quantity, l.ConversionFactor, l.BaseQuantity,
                l.Rate, l.Discount, l.LineTotal, l.UnitCost, l.LineCost)).ToList());
    }

    private sealed record LineCalc(
        Item Item, Guid UnitId, decimal Quantity, decimal Conversion,
        decimal BaseQuantity, decimal Rate, decimal Discount, decimal LineTotal, decimal UnitCost);
}
