using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Common;

public static class StockPosting
{
    public static async Task<decimal> GetOnHandAsync(AppDbContext db, Guid itemId, Guid godownId, CancellationToken ct) =>
        await db.StockItems
            .Where(s => s.ItemId == itemId && s.GodownId == godownId)
            .Select(s => (decimal?)s.Quantity)
            .FirstOrDefaultAsync(ct) ?? 0m;

    public static async Task<StockMovement> ApplyMovementAsync(
        AppDbContext db,
        Guid itemId, Guid godownId, MovementType type, decimal signedQty, decimal incomingUnitCost,
        DateTime date, string? reference, string? notes, CancellationToken ct)
    {
        var stockItem = await db.StockItems
            .FirstOrDefaultAsync(s => s.ItemId == itemId && s.GodownId == godownId, ct);

        if (stockItem is null)
        {
            stockItem = new StockItem { ItemId = itemId, GodownId = godownId, Quantity = 0m, AverageCost = 0m };
            db.StockItems.Add(stockItem);
        }

        decimal appliedUnitCost;
        if (signedQty >= 0)
        {
            var newQty = stockItem.Quantity + signedQty;
            var newValue = (stockItem.Quantity * stockItem.AverageCost) + (signedQty * incomingUnitCost);
            stockItem.AverageCost = newQty > 0 ? newValue / newQty : incomingUnitCost;
            stockItem.Quantity = newQty;
            appliedUnitCost = incomingUnitCost;
        }
        else
        {
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
        db.StockMovements.Add(movement);
        return movement;
    }
}
