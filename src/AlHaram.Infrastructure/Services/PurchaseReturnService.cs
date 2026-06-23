using AlHaram.Application.Common;
using AlHaram.Application.Common.Models;
using AlHaram.Application.Purchasing;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class PurchaseReturnService : IPurchaseReturnService
{
    private readonly AppDbContext _db;
    private readonly IBranchScope _branch;

    public PurchaseReturnService(AppDbContext db, IBranchScope branch)
    {
        _db = db;
        _branch = branch;
    }

    public async Task<IReadOnlyList<PurchaseReturnDto>> GetAllAsync(CancellationToken ct = default)
    {
        var returns = await _db.PurchaseReturns
            .Include(r => r.Supplier)
            .Include(r => r.Godown)
            .Include(r => r.PurchaseInvoice)
            .Include(r => r.Lines).ThenInclude(l => l.Item)
            .Include(r => r.Lines).ThenInclude(l => l.Unit)
            .ForBranch(_branch)
            .OrderByDescending(r => r.Date)
            .ThenByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

        return returns.Select(ToDto).ToList();
    }

    public async Task<PurchaseReturnDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var r = await _db.PurchaseReturns
            .Include(r => r.Supplier)
            .Include(r => r.Godown)
            .Include(r => r.PurchaseInvoice)
            .Include(r => r.Lines).ThenInclude(l => l.Item)
            .Include(r => r.Lines).ThenInclude(l => l.Unit)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return r is null ? null : ToDto(r);
    }

    public async Task<Result<PurchaseReturnDto>> CreateAsync(SavePurchaseReturnRequest request, CancellationToken ct = default)
    {
        if (request.Lines is null || request.Lines.Count == 0)
            return Result<PurchaseReturnDto>.Failure("Add at least one line.");

        var invoice = await _db.PurchaseInvoices
            .Include(i => i.Lines).ThenInclude(l => l.Item)
            .Include(i => i.Lines).ThenInclude(l => l.Unit)
            .FirstOrDefaultAsync(i => i.Id == request.PurchaseInvoiceId, ct);
        if (invoice is null) return Result<PurchaseReturnDto>.Failure("Original invoice not found.");

        var returnedByLine = await _db.PurchaseReturnLines
            .Where(l => l.PurchaseReturn!.PurchaseInvoiceId == invoice.Id)
            .GroupBy(l => new { l.ItemId, l.UnitId })
            .Select(g => new { g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToListAsync(ct);

        var errors = new List<string>();
        var lineEntities = new List<PurchaseReturnLine>();
        decimal subtotal = 0m;

        foreach (var l in request.Lines)
        {
            if (l.Quantity <= 0) { errors.Add("Quantity must be greater than zero on every line."); continue; }
            var invLine = invoice.Lines.FirstOrDefault(x => x.Id == l.PurchaseInvoiceLineId);
            if (invLine is null) { errors.Add("An invoice line was not found."); continue; }

            var already = returnedByLine
                .Where(r => r.Key.ItemId == invLine.ItemId && r.Key.UnitId == invLine.UnitId)
                .Sum(r => r.Qty);
            var returnable = invLine.Quantity - already;
            if (l.Quantity > returnable + 0.0049m)
            {
                errors.Add($"Return quantity for '{invLine.Item?.Name}' exceeds returnable ({returnable:0.##}).");
                continue;
            }

            var baseQty = l.Quantity * invLine.ConversionFactor;
            var lineTotal = l.Quantity * invLine.Rate;
            subtotal += lineTotal;

            lineEntities.Add(new PurchaseReturnLine
            {
                ItemId = invLine.ItemId,
                UnitId = invLine.UnitId,
                Quantity = l.Quantity,
                ConversionFactor = invLine.ConversionFactor,
                BaseQuantity = baseQty,
                Rate = invLine.Rate,
                LineTotal = lineTotal,
                UnitCost = invLine.UnitCost,
                LineCost = invLine.UnitCost * baseQty
            });
        }
        if (errors.Count > 0) return Result<PurchaseReturnDto>.Failure(errors.Distinct().ToArray());

        var taxAmount = invoice.Subtotal > 0
            ? Math.Round(subtotal / invoice.Subtotal * invoice.TaxAmount, 4)
            : 0m;
        var total = subtotal + taxAmount;

        var ret = new PurchaseReturn
        {
            Number = await NextReturnNumberAsync(ct),
            Date = request.Date,
            SupplierId = invoice.SupplierId,
            GodownId = invoice.GodownId,
            PurchaseInvoiceId = invoice.Id,
            Subtotal = subtotal,
            TaxAmount = taxAmount,
            Total = total,
            Reason = request.Reason,
            Notes = request.Notes
        };

        foreach (var line in lineEntities)
        {
            ret.Lines.Add(line);

            var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == line.ItemId, ct);
            if (item is not null && item.TrackInventory)
            {
                await ApplyStockOutAsync(line.ItemId, invoice.GodownId, MovementType.PurchaseReturn,
                    line.BaseQuantity, request.Date, ret.Number, ct);
            }
        }

        _db.PurchaseReturns.Add(ret);
        await _db.SaveChangesAsync(ct);

        var saved = await GetByIdAsync(ret.Id, ct);
        return Result<PurchaseReturnDto>.Success(saved!);
    }

    private async Task ApplyStockOutAsync(
        Guid itemId, Guid godownId, MovementType type, decimal baseQty,
        DateTime date, string reference, CancellationToken ct)
    {
        var stockItem = await _db.StockItems
            .FirstOrDefaultAsync(s => s.ItemId == itemId && s.GodownId == godownId, ct);
        if (stockItem is null)
        {
            stockItem = new StockItem { ItemId = itemId, GodownId = godownId, Quantity = 0m, AverageCost = 0m };
            _db.StockItems.Add(stockItem);
        }

        var unitCost = stockItem.AverageCost;
        stockItem.Quantity -= baseQty;

        _db.StockMovements.Add(new StockMovement
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
        });
    }

    private async Task<string> NextReturnNumberAsync(CancellationToken ct)
    {
        var count = await _db.PurchaseReturns.IgnoreQueryFilters().CountAsync(ct);
        return $"PR-{count + 1:D5}";
    }

    private static PurchaseReturnDto ToDto(PurchaseReturn r) =>
        new(r.Id, r.Number, r.Date,
            r.SupplierId, r.Supplier?.Name ?? string.Empty,
            r.GodownId, r.Godown?.Name ?? string.Empty,
            r.PurchaseInvoiceId, r.PurchaseInvoice?.Number ?? string.Empty,
            r.Subtotal, r.TaxAmount, r.Total,
            r.Reason, r.Notes,
            r.Lines.Select(l => new PurchaseReturnLineDto(
                l.Id, l.ItemId, l.Item?.Code ?? string.Empty, l.Item?.Name ?? string.Empty,
                l.UnitId, l.Unit?.Code ?? string.Empty,
                l.Quantity, l.ConversionFactor, l.BaseQuantity,
                l.Rate, l.LineTotal, l.UnitCost, l.LineCost)).ToList());
}
