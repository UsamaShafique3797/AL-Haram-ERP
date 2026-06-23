using AlHaram.Application.Common;
using AlHaram.Application.Common.Models;
using AlHaram.Application.Sales;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class SalesReturnService : ISalesReturnService
{
    private readonly AppDbContext _db;
    private readonly IBranchScope _branch;

    public SalesReturnService(AppDbContext db, IBranchScope branch)
    {
        _db = db;
        _branch = branch;
    }

    public async Task<IReadOnlyList<SalesReturnDto>> GetAllAsync(CancellationToken ct = default)
    {
        var returns = await _db.SalesReturns
            .Include(r => r.Customer)
            .Include(r => r.Godown)
            .Include(r => r.SalesInvoice)
            .Include(r => r.Lines).ThenInclude(l => l.Item)
            .Include(r => r.Lines).ThenInclude(l => l.Unit)
            .ForBranch(_branch)
            .OrderByDescending(r => r.Date)
            .ThenByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

        return returns.Select(ToDto).ToList();
    }

    public async Task<SalesReturnDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var r = await _db.SalesReturns
            .Include(r => r.Customer)
            .Include(r => r.Godown)
            .Include(r => r.SalesInvoice)
            .Include(r => r.Lines).ThenInclude(l => l.Item)
            .Include(r => r.Lines).ThenInclude(l => l.Unit)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return r is null ? null : ToDto(r);
    }

    public async Task<Result<SalesReturnDto>> CreateAsync(SaveSalesReturnRequest request, CancellationToken ct = default)
    {
        if (request.Lines is null || request.Lines.Count == 0)
            return Result<SalesReturnDto>.Failure("Add at least one line.");

        var invoice = await _db.SalesInvoices
            .Include(i => i.Lines).ThenInclude(l => l.Item)
            .Include(i => i.Lines).ThenInclude(l => l.Unit)
            .FirstOrDefaultAsync(i => i.Id == request.SalesInvoiceId, ct);
        if (invoice is null) return Result<SalesReturnDto>.Failure("Original invoice not found.");

        // How much of each original line has already been returned?
        var returnedByLine = await _db.SalesReturnLines
            .Where(l => l.SalesReturn!.SalesInvoiceId == invoice.Id)
            .GroupBy(l => new { l.ItemId, l.UnitId })
            .Select(g => new { g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToListAsync(ct);

        var errors = new List<string>();
        var lineEntities = new List<SalesReturnLine>();
        decimal subtotal = 0m;

        foreach (var l in request.Lines)
        {
            if (l.Quantity <= 0) { errors.Add("Quantity must be greater than zero on every line."); continue; }
            var invLine = invoice.Lines.FirstOrDefault(x => x.Id == l.SalesInvoiceLineId);
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

            lineEntities.Add(new SalesReturnLine
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
        if (errors.Count > 0) return Result<SalesReturnDto>.Failure(errors.Distinct().ToArray());

        // Tax follows the invoice's tax rate proportionally to subtotal returned (after the invoice's discount distribution)
        var taxAmount = invoice.Subtotal > 0
            ? Math.Round(subtotal / invoice.Subtotal * invoice.TaxAmount, 4)
            : 0m;
        var total = subtotal + taxAmount;

        var ret = new SalesReturn
        {
            Number = await NextReturnNumberAsync(ct),
            Date = request.Date,
            CustomerId = invoice.CustomerId,
            GodownId = invoice.GodownId,
            SalesInvoiceId = invoice.Id,
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
                await ApplyStockInAsync(line.ItemId, invoice.GodownId, MovementType.SalesReturn,
                    line.BaseQuantity, line.UnitCost, request.Date, ret.Number, ct);
            }
        }

        _db.SalesReturns.Add(ret);
        await _db.SaveChangesAsync(ct);

        var saved = await GetByIdAsync(ret.Id, ct);
        return Result<SalesReturnDto>.Success(saved!);
    }

    private async Task ApplyStockInAsync(
        Guid itemId, Guid godownId, MovementType type, decimal baseQty,
        decimal unitCost, DateTime date, string reference, CancellationToken ct)
    {
        var stockItem = await _db.StockItems
            .FirstOrDefaultAsync(s => s.ItemId == itemId && s.GodownId == godownId, ct);
        if (stockItem is null)
        {
            stockItem = new StockItem { ItemId = itemId, GodownId = godownId, Quantity = 0m, AverageCost = unitCost };
            _db.StockItems.Add(stockItem);
        }

        // Restock at the original sale cost; keep average cost unchanged (small adjustment otherwise).
        var newQty = stockItem.Quantity + baseQty;
        if (newQty > 0)
        {
            var newValue = (stockItem.Quantity * stockItem.AverageCost) + (baseQty * unitCost);
            stockItem.AverageCost = newValue / newQty;
        }
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

    private async Task<string> NextReturnNumberAsync(CancellationToken ct)
    {
        var count = await _db.SalesReturns.IgnoreQueryFilters().CountAsync(ct);
        return $"SR-{count + 1:D5}";
    }

    private static SalesReturnDto ToDto(SalesReturn r) =>
        new(r.Id, r.Number, r.Date,
            r.CustomerId, r.Customer?.Name ?? string.Empty,
            r.GodownId, r.Godown?.Name ?? string.Empty,
            r.SalesInvoiceId, r.SalesInvoice?.Number ?? string.Empty,
            r.Subtotal, r.TaxAmount, r.Total,
            r.Reason, r.Notes,
            r.Lines.Select(l => new SalesReturnLineDto(
                l.Id, l.ItemId, l.Item?.Code ?? string.Empty, l.Item?.Name ?? string.Empty,
                l.UnitId, l.Unit?.Code ?? string.Empty,
                l.Quantity, l.ConversionFactor, l.BaseQuantity,
                l.Rate, l.LineTotal, l.UnitCost, l.LineCost)).ToList());
}
