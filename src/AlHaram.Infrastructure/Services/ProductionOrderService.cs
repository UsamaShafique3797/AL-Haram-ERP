using AlHaram.Application.Common;
using AlHaram.Application.Common.Models;
using AlHaram.Application.Production;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class ProductionOrderService : IProductionOrderService
{
    private readonly AppDbContext _db;
    private readonly IBranchScope _branch;

    public ProductionOrderService(AppDbContext db, IBranchScope branch)
    {
        _db = db;
        _branch = branch;
    }

    public async Task<IReadOnlyList<ProductionOrderDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.ProductionOrders
            .Include(o => o.Godown)
            .Include(o => o.FinishedItem)
            .Include(o => o.ScrapItem)
            .Include(o => o.Lines).ThenInclude(l => l.Item)
            .ForBranch(_branch)
            .OrderByDescending(o => o.Date)
            .ThenByDescending(o => o.CreatedAt)
            .Select(o => ToDto(o))
            .ToListAsync(ct);
    }

    public async Task<ProductionOrderDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var order = await _db.ProductionOrders
            .Include(o => o.Godown)
            .Include(o => o.FinishedItem)
            .Include(o => o.ScrapItem)
            .Include(o => o.Lines).ThenInclude(l => l.Item)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
        return order is null ? null : ToDto(order);
    }

    public async Task<Result<ProductionOrderDto>> CreateAsync(SaveProductionOrderRequest request, CancellationToken ct = default)
    {
        if (request.Quantity <= 0)
            return Result<ProductionOrderDto>.Failure("Output quantity must be greater than zero.");
        if (request.LaborOverhead < 0)
            return Result<ProductionOrderDto>.Failure("Labor/overhead cannot be negative.");
        if (request.ScrapQuantity < 0)
            return Result<ProductionOrderDto>.Failure("Scrap quantity cannot be negative.");
        if (!await _db.Godowns.AnyAsync(g => g.Id == request.GodownId, ct))
            return Result<ProductionOrderDto>.Failure("Godown not found.");

        var bom = await _db.BillOfMaterials
            .Include(b => b.Components)
            .FirstOrDefaultAsync(b => b.Id == request.BillOfMaterialsId && b.IsActive, ct);
        if (bom is null) return Result<ProductionOrderDto>.Failure("BOM not found or inactive.");
        if (bom.Components.Count == 0)
            return Result<ProductionOrderDto>.Failure("BOM has no components.");

        if (request.ScrapItemId is not null && !await _db.Items.AnyAsync(i => i.Id == request.ScrapItemId, ct))
            return Result<ProductionOrderDto>.Failure("Scrap item not found.");

        var order = new ProductionOrder
        {
            Number = await NextProductionNumberAsync(ct),
            Date = request.Date,
            GodownId = request.GodownId,
            BillOfMaterialsId = bom.Id,
            FinishedItemId = bom.FinishedItemId,
            Quantity = request.Quantity,
            LaborOverhead = request.LaborOverhead,
            ScrapItemId = request.ScrapItemId,
            ScrapQuantity = request.ScrapQuantity,
            Status = ProductionOrderStatus.Draft,
            Notes = request.Notes
        };
        _db.ProductionOrders.Add(order);

        foreach (var component in bom.Components)
        {
            order.Lines.Add(new ProductionOrderLine
            {
                LineType = ProductionLineType.Consume,
                ItemId = component.RawItemId,
                Quantity = component.QuantityPerUnit * request.Quantity
            });
        }

        order.Lines.Add(new ProductionOrderLine
        {
            LineType = ProductionLineType.Produce,
            ItemId = bom.FinishedItemId,
            Quantity = request.Quantity
        });

        await _db.SaveChangesAsync(ct);
        return Result<ProductionOrderDto>.Success((await GetByIdAsync(order.Id, ct))!);
    }

    public async Task<Result<ProductionOrderDto>> CompleteAsync(Guid id, CancellationToken ct = default)
    {
        var order = await _db.ProductionOrders
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null) return Result<ProductionOrderDto>.Failure("Production order not found.");
        if (order.Status == ProductionOrderStatus.Completed)
            return Result<ProductionOrderDto>.Failure("Production order is already completed.");
        if (order.Status == ProductionOrderStatus.Cancelled)
            return Result<ProductionOrderDto>.Failure("Cancelled orders cannot be completed.");

        var consumeLines = order.Lines.Where(l => l.LineType == ProductionLineType.Consume).ToList();
        var produceLine = order.Lines.FirstOrDefault(l => l.LineType == ProductionLineType.Produce);
        if (produceLine is null)
            return Result<ProductionOrderDto>.Failure("Production order has no output line.");

        var errors = new List<string>();
        foreach (var line in consumeLines)
        {
            var onHand = await GetOnHandAsync(line.ItemId, order.GodownId, ct);
            if (line.Quantity > onHand)
            {
                var itemName = await _db.Items.Where(i => i.Id == line.ItemId).Select(i => i.Name).FirstOrDefaultAsync(ct);
                errors.Add($"Insufficient stock for '{itemName}': need {line.Quantity}, have {onHand}.");
            }
        }
        if (errors.Count > 0) return Result<ProductionOrderDto>.Failure(errors.ToArray());

        decimal rawMaterialCost = 0m;
        foreach (var line in consumeLines)
        {
            var movement = await ApplyMovementAsync(
                line.ItemId, order.GodownId, MovementType.Production,
                -line.Quantity, 0m, order.Date, order.Number, "Raw consumption", ct);

            line.UnitCost = movement.UnitCost;
            line.LineCost = movement.UnitCost * line.Quantity;
            rawMaterialCost += line.LineCost;
        }

        var totalCost = rawMaterialCost + order.LaborOverhead;
        var finishedUnitCost = order.Quantity > 0 ? totalCost / order.Quantity : 0m;

        await ApplyMovementAsync(
            produceLine.ItemId, order.GodownId, MovementType.Production,
            order.Quantity, finishedUnitCost, order.Date, order.Number, "Finished goods", ct);

        produceLine.UnitCost = finishedUnitCost;
        produceLine.LineCost = totalCost;

        if (order.ScrapQuantity > 0 && order.ScrapItemId is not null)
        {
            var scrapUnitCost = order.ScrapQuantity > 0 ? totalCost * 0.1m / order.ScrapQuantity : 0m;
            await ApplyMovementAsync(
                order.ScrapItemId.Value, order.GodownId, MovementType.Production,
                order.ScrapQuantity, scrapUnitCost, order.Date, order.Number, "Production scrap", ct);

            order.Lines.Add(new ProductionOrderLine
            {
                LineType = ProductionLineType.Scrap,
                ItemId = order.ScrapItemId.Value,
                Quantity = order.ScrapQuantity,
                UnitCost = scrapUnitCost,
                LineCost = scrapUnitCost * order.ScrapQuantity
            });
        }

        order.RawMaterialCost = rawMaterialCost;
        order.FinishedUnitCost = finishedUnitCost;
        order.TotalCost = totalCost;
        order.Status = ProductionOrderStatus.Completed;

        await _db.SaveChangesAsync(ct);
        return Result<ProductionOrderDto>.Success((await GetByIdAsync(id, ct))!);
    }

    public async Task<Result<ProductionOrderDto>> CancelAsync(Guid id, CancellationToken ct = default)
    {
        var order = await _db.ProductionOrders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null) return Result<ProductionOrderDto>.Failure("Production order not found.");
        if (order.Status == ProductionOrderStatus.Completed)
            return Result<ProductionOrderDto>.Failure("Completed orders cannot be cancelled.");

        order.Status = ProductionOrderStatus.Cancelled;
        await _db.SaveChangesAsync(ct);
        return Result<ProductionOrderDto>.Success((await GetByIdAsync(id, ct))!);
    }

    private async Task<decimal> GetOnHandAsync(Guid itemId, Guid godownId, CancellationToken ct) =>
        await _db.StockItems
            .Where(s => s.ItemId == itemId && s.GodownId == godownId)
            .Select(s => (decimal?)s.Quantity)
            .FirstOrDefaultAsync(ct) ?? 0m;

    private async Task<StockMovement> ApplyMovementAsync(
        Guid itemId, Guid godownId, MovementType type, decimal signedQty, decimal incomingUnitCost,
        DateTime date, string? reference, string? notes, CancellationToken ct)
    {
        var stockItem = await _db.StockItems
            .FirstOrDefaultAsync(s => s.ItemId == itemId && s.GodownId == godownId, ct);

        if (stockItem is null)
        {
            stockItem = new StockItem { ItemId = itemId, GodownId = godownId, Quantity = 0m, AverageCost = 0m };
            _db.StockItems.Add(stockItem);
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
        _db.StockMovements.Add(movement);
        return movement;
    }

    private async Task<string> NextProductionNumberAsync(CancellationToken ct)
    {
        var count = await _db.ProductionOrders.IgnoreQueryFilters().CountAsync(ct);
        return $"PRD-{count + 1:D5}";
    }

    private static ProductionOrderDto ToDto(ProductionOrder o) =>
        new(o.Id, o.Number, o.Date, o.GodownId, o.Godown?.Name ?? string.Empty,
            o.BillOfMaterialsId, o.FinishedItemId, o.FinishedItem?.Code ?? string.Empty, o.FinishedItem?.Name ?? string.Empty,
            o.Quantity, o.LaborOverhead, o.Status, o.RawMaterialCost, o.FinishedUnitCost, o.TotalCost,
            o.ScrapItemId, o.ScrapItem?.Code, o.ScrapItem?.Name, o.ScrapQuantity, o.Notes,
            o.Lines.OrderBy(l => l.LineType).ThenBy(l => l.Item?.Name)
                .Select(l => new ProductionOrderLineDto(
                    l.Id, l.LineType, l.ItemId, l.Item?.Code ?? string.Empty, l.Item?.Name ?? string.Empty,
                    l.Quantity, l.UnitCost, l.LineCost)).ToList());
}
