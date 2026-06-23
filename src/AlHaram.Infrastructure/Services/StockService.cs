using AlHaram.Application.Common.Models;
using AlHaram.Application.Common;
using AlHaram.Application.Stock;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class StockService : IStockService
{
    private readonly AppDbContext _db;
    private readonly IBranchScope _branch;

    public StockService(AppDbContext db, IBranchScope branch)
    {
        _db = db;
        _branch = branch;
    }

    public async Task<IReadOnlyList<StockLevelDto>> GetLevelsAsync(CancellationToken ct = default)
    {
        return await _db.StockItems
            .Include(s => s.Item)
            .Include(s => s.Godown)
            .ForBranch(_branch)
            .OrderBy(s => s.Item!.Name)
            .Select(s => new StockLevelDto(
                s.ItemId,
                s.Item!.Code,
                s.Item!.Name,
                s.Item!.BaseUnit!.Code,
                s.GodownId,
                s.Godown!.Name,
                s.Quantity,
                s.AverageCost,
                s.Quantity * s.AverageCost,
                s.Item!.ReorderLevel,
                s.Item!.TrackInventory && s.Item!.ReorderLevel > 0 && s.Quantity < s.Item!.ReorderLevel))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<StockMovementDto>> GetMovementsAsync(
        Guid itemId, Guid? godownId = null, CancellationToken ct = default)
    {
        var query = _db.StockMovements
            .Include(m => m.Item)
            .Include(m => m.Godown)
            .Where(m => m.ItemId == itemId);

        if (godownId is not null)
            query = query.Where(m => m.GodownId == godownId);

        return await query
            .OrderByDescending(m => m.Date)
            .ThenByDescending(m => m.CreatedAt)
            .Select(m => new StockMovementDto(
                m.Id,
                m.Date,
                m.Type.ToString(),
                m.ItemId,
                m.Item!.Name,
                m.GodownId,
                m.Godown!.Name,
                m.Quantity,
                m.UnitCost,
                m.QuantityAfter,
                m.AverageCostAfter,
                m.Reference,
                m.Notes))
            .ToListAsync(ct);
    }

    public async Task<Result<StockMovementDto>> PostOpeningStockAsync(
        OpeningStockRequest request, CancellationToken ct = default)
    {
        if (!_branch.CanUseGodown(request.GodownId))
            return Result<StockMovementDto>.Failure("You can only post stock for your assigned branch.");

        if (request.Quantity <= 0)
            return Result<StockMovementDto>.Failure("Opening quantity must be greater than zero.");
        if (request.UnitCost < 0)
            return Result<StockMovementDto>.Failure("Unit cost cannot be negative.");

        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == request.ItemId, ct);
        if (item is null) return Result<StockMovementDto>.Failure("Item not found.");
        if (!await _db.Godowns.AnyAsync(g => g.Id == request.GodownId, ct))
            return Result<StockMovementDto>.Failure("Godown not found.");

        var movement = await ApplyMovementAsync(
            request.ItemId, request.GodownId, MovementType.OpeningStock,
            request.Quantity, request.UnitCost, request.Date, "Opening", request.Notes, ct);

        await _db.SaveChangesAsync(ct);

        var godownName = await _db.Godowns.Where(g => g.Id == request.GodownId).Select(g => g.Name).FirstAsync(ct);
        return Result<StockMovementDto>.Success(new StockMovementDto(
            movement.Id, movement.Date, movement.Type.ToString(), item.Id, item.Name,
            request.GodownId, godownName, movement.Quantity, movement.UnitCost,
            movement.QuantityAfter, movement.AverageCostAfter, movement.Reference, movement.Notes));
    }

    public async Task<Result<StockLevelDto>> UpdateStockLevelAsync(
        UpdateStockLevelRequest request, CancellationToken ct = default)
    {
        if (request.Quantity < 0)
            return Result<StockLevelDto>.Failure("Quantity cannot be negative.");
        if (request.UnitCost < 0)
            return Result<StockLevelDto>.Failure("Unit cost cannot be negative.");

        var stockItem = await _db.StockItems
            .Include(s => s.Item).ThenInclude(i => i!.BaseUnit)
            .Include(s => s.Godown)
            .FirstOrDefaultAsync(s => s.ItemId == request.ItemId && s.GodownId == request.GodownId, ct);

        if (stockItem is null)
            return Result<StockLevelDto>.Failure("No stock on hand for this item in the selected godown.");

        var oldQty = stockItem.Quantity;
        var oldCost = stockItem.AverageCost;
        var qtyDelta = request.Quantity - oldQty;
        var newCost = request.Quantity > 0 ? request.UnitCost : 0m;

        stockItem.Quantity = request.Quantity;
        stockItem.AverageCost = newCost;

        if (qtyDelta != 0 || oldCost != newCost)
        {
            _db.StockMovements.Add(new StockMovement
            {
                ItemId = request.ItemId,
                GodownId = request.GodownId,
                Type = qtyDelta >= 0 ? MovementType.AdjustmentIncrease : MovementType.AdjustmentDecrease,
                Date = request.Date,
                Quantity = qtyDelta != 0 ? qtyDelta : 0m,
                UnitCost = newCost,
                QuantityAfter = request.Quantity,
                AverageCostAfter = newCost,
                Reference = "Stock correction",
                Notes = request.Notes ?? (oldCost != newCost && qtyDelta == 0
                    ? $"Average cost updated from {oldCost:N2} to {newCost:N2}"
                    : null),
            });
        }

        await _db.SaveChangesAsync(ct);

        return Result<StockLevelDto>.Success(ToLevelDto(stockItem));
    }

    public async Task<Result> DeleteStockLevelAsync(Guid itemId, Guid godownId, CancellationToken ct = default)
    {
        var stockItem = await _db.StockItems
            .FirstOrDefaultAsync(s => s.ItemId == itemId && s.GodownId == godownId, ct);

        if (stockItem is null)
            return Result.Failure("No stock on hand for this item in the selected godown.");

        if (stockItem.Quantity > 0)
        {
            _db.StockMovements.Add(new StockMovement
            {
                ItemId = itemId,
                GodownId = godownId,
                Type = MovementType.AdjustmentDecrease,
                Date = DateTime.UtcNow,
                Quantity = -stockItem.Quantity,
                UnitCost = stockItem.AverageCost,
                QuantityAfter = 0m,
                AverageCostAfter = 0m,
                Reference = "Stock removed",
                Notes = "Stock on hand deleted",
            });
            stockItem.Quantity = 0m;
            stockItem.AverageCost = 0m;
        }

        _db.StockItems.Remove(stockItem);
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<IReadOnlyList<StockAdjustmentDto>> GetAdjustmentsAsync(CancellationToken ct = default)
    {
        return await _db.StockAdjustments
            .Include(a => a.Godown)
            .Include(a => a.Lines).ThenInclude(l => l.Item)
            .OrderByDescending(a => a.Date)
            .ThenByDescending(a => a.CreatedAt)
            .Select(a => ToAdjustmentDto(a))
            .ToListAsync(ct);
    }

    public async Task<StockAdjustmentDto?> GetAdjustmentByIdAsync(Guid id, CancellationToken ct = default)
    {
        var adjustment = await _db.StockAdjustments
            .Include(a => a.Godown)
            .Include(a => a.Lines).ThenInclude(l => l.Item)
            .FirstOrDefaultAsync(a => a.Id == id, ct);
        return adjustment is null ? null : ToAdjustmentDto(adjustment);
    }

    public async Task<Result<StockAdjustmentDto>> CreateAdjustmentAsync(
        SaveStockAdjustmentRequest request, CancellationToken ct = default)
    {
        if (request.Lines is null || request.Lines.Count == 0)
            return Result<StockAdjustmentDto>.Failure("Add at least one line.");
        if (!await _db.Godowns.AnyAsync(g => g.Id == request.GodownId, ct))
            return Result<StockAdjustmentDto>.Failure("Godown not found.");

        var errors = new List<string>();
        foreach (var line in request.Lines)
        {
            if (line.Quantity <= 0)
                errors.Add("Quantity must be greater than zero on every line.");

            var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == line.ItemId, ct);
            if (item is null) { errors.Add("A selected item does not exist."); continue; }

            if (line.Direction == AdjustmentDirection.Decrease)
            {
                var onHand = await _db.StockItems
                    .Where(s => s.ItemId == line.ItemId && s.GodownId == request.GodownId)
                    .Select(s => (decimal?)s.Quantity)
                    .FirstOrDefaultAsync(ct) ?? 0m;
                if (line.Quantity > onHand)
                    errors.Add($"Cannot decrease '{item.Name}' by {line.Quantity}; only {onHand} on hand.");
            }
        }
        if (errors.Count > 0) return Result<StockAdjustmentDto>.Failure(errors.Distinct().ToArray());

        var adjustment = new StockAdjustment
        {
            Number = await NextAdjustmentNumberAsync(ct),
            Date = request.Date,
            GodownId = request.GodownId,
            Reason = request.Reason,
            Notes = request.Notes
        };
        _db.StockAdjustments.Add(adjustment);

        foreach (var line in request.Lines)
        {
            adjustment.Lines.Add(new StockAdjustmentLine
            {
                ItemId = line.ItemId,
                Direction = line.Direction,
                Quantity = line.Quantity,
                UnitCost = line.UnitCost,
                Notes = line.Notes
            });

            var signedQty = line.Direction == AdjustmentDirection.Increase ? line.Quantity : -line.Quantity;
            var type = line.Direction == AdjustmentDirection.Increase
                ? MovementType.AdjustmentIncrease
                : MovementType.AdjustmentDecrease;

            await ApplyMovementAsync(line.ItemId, request.GodownId, type, signedQty,
                line.UnitCost, request.Date, adjustment.Number, line.Notes, ct);
        }

        await _db.SaveChangesAsync(ct);
        var saved = await GetAdjustmentByIdAsync(adjustment.Id, ct);
        return Result<StockAdjustmentDto>.Success(saved!);
    }

    // ---- core stock posting (weighted average) ------------------------------

    private async Task<StockMovement> ApplyMovementAsync(
        Guid itemId, Guid godownId, MovementType type, decimal signedQty, decimal incomingUnitCost,
        DateTime date, string? reference, string? notes, CancellationToken ct)
    {
        var stockItem = await GetOrCreateStockItemAsync(itemId, godownId, ct);

        decimal appliedUnitCost;
        if (signedQty >= 0)
        {
            // Incoming: recompute weighted-average cost.
            var newQty = stockItem.Quantity + signedQty;
            var newValue = (stockItem.Quantity * stockItem.AverageCost) + (signedQty * incomingUnitCost);
            stockItem.AverageCost = newQty > 0 ? newValue / newQty : incomingUnitCost;
            stockItem.Quantity = newQty;
            appliedUnitCost = incomingUnitCost;
        }
        else
        {
            // Outgoing: cost out at current average; average is unchanged.
            appliedUnitCost = stockItem.AverageCost;
            stockItem.Quantity += signedQty;
        }

        var movement = new StockMovement
        {
            ItemId = itemId,
            GodownId = godownId,
            Type = type,
            Date = date,
            Quantity = signedQty,
            UnitCost = appliedUnitCost,
            QuantityAfter = stockItem.Quantity,
            AverageCostAfter = stockItem.AverageCost,
            Reference = reference,
            Notes = notes
        };
        _db.StockMovements.Add(movement);
        return movement;
    }

    private async Task<StockItem> GetOrCreateStockItemAsync(Guid itemId, Guid godownId, CancellationToken ct)
    {
        var stockItem = await _db.StockItems
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.ItemId == itemId && s.GodownId == godownId, ct);

        if (stockItem is not null)
        {
            if (stockItem.IsDeleted)
            {
                stockItem.IsDeleted = false;
                stockItem.Quantity = 0m;
                stockItem.AverageCost = 0m;
            }
            return stockItem;
        }

        stockItem = new StockItem { ItemId = itemId, GodownId = godownId, Quantity = 0m, AverageCost = 0m };
        _db.StockItems.Add(stockItem);
        return stockItem;
    }

    private async Task<string> NextAdjustmentNumberAsync(CancellationToken ct)
    {
        var count = await _db.StockAdjustments.IgnoreQueryFilters().CountAsync(ct);
        return $"ADJ-{count + 1:D5}";
    }

    private static StockAdjustmentDto ToAdjustmentDto(StockAdjustment a) =>
        new(a.Id, a.Number, a.Date, a.GodownId, a.Godown?.Name ?? string.Empty, a.Reason, a.Notes,
            a.Lines.Select(l => new StockAdjustmentLineDto(
                l.Id, l.ItemId, l.Item?.Code ?? string.Empty, l.Item?.Name ?? string.Empty,
                l.Direction, l.Quantity, l.UnitCost, l.Notes)).ToList());

    private static StockLevelDto ToLevelDto(StockItem s) =>
        new(
            s.ItemId,
            s.Item!.Code,
            s.Item!.Name,
            s.Item!.BaseUnit!.Code,
            s.GodownId,
            s.Godown!.Name,
            s.Quantity,
            s.AverageCost,
            s.Quantity * s.AverageCost,
            s.Item!.ReorderLevel,
            s.Item!.TrackInventory && s.Item!.ReorderLevel > 0 && s.Quantity < s.Item!.ReorderLevel);
}
