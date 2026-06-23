using AlHaram.Application.Common;
using AlHaram.Application.Common.Models;
using AlHaram.Application.Purchasing;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Common;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class GrnService : IGrnService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogService _audit;
    private readonly IBranchScope _branch;

    public GrnService(AppDbContext db, IAuditLogService audit, IBranchScope branch)
    {
        _db = db;
        _audit = audit;
        _branch = branch;
    }

    public async Task<IReadOnlyList<GrnDto>> GetAllAsync(Guid? supplierId = null, CancellationToken ct = default)
    {
        var query = _db.GoodsReceivedNotes
            .Include(g => g.Supplier)
            .Include(g => g.Godown)
            .Include(g => g.PurchaseOrder)
            .Include(g => g.Lines).ThenInclude(l => l.Item)
            .Include(g => g.Lines).ThenInclude(l => l.Unit)
            .AsQueryable()
            .ForBranch(_branch);

        if (supplierId is not null)
            query = query.Where(g => g.SupplierId == supplierId);

        var list = await query.OrderByDescending(g => g.Date).ThenByDescending(g => g.CreatedAt).ToListAsync(ct);
        return list.Select(ToDto).ToList();
    }

    public async Task<GrnDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var grn = await _db.GoodsReceivedNotes
            .Include(g => g.Supplier)
            .Include(g => g.Godown)
            .Include(g => g.PurchaseOrder)
            .Include(g => g.Lines).ThenInclude(l => l.Item)
            .Include(g => g.Lines).ThenInclude(l => l.Unit)
            .FirstOrDefaultAsync(g => g.Id == id, ct);
        return grn is null ? null : ToDto(grn);
    }

    public async Task<Result<GrnDto>> CreateAsync(SaveGrnRequest request, CancellationToken ct = default)
    {
        if (request.Lines is null || request.Lines.Count == 0)
            return Result<GrnDto>.Failure("Add at least one line.");

        if (!await _db.Suppliers.AnyAsync(s => s.Id == request.SupplierId, ct))
            return Result<GrnDto>.Failure("Supplier not found.");
        if (!await _db.Godowns.AnyAsync(g => g.Id == request.GodownId, ct))
            return Result<GrnDto>.Failure("Godown not found.");

        PurchaseOrder? po = null;
        if (request.PurchaseOrderId is not null)
        {
            po = await _db.PurchaseOrders.Include(p => p.Lines).FirstOrDefaultAsync(p => p.Id == request.PurchaseOrderId, ct);
            if (po is null) return Result<GrnDto>.Failure("Purchase order not found.");
            if (po.Status == PurchaseOrderStatus.Cancelled)
                return Result<GrnDto>.Failure("Cannot receive against a cancelled purchase order.");
        }

        var errors = new List<string>();
        var lineData = new List<(SaveGrnLineRequest Line, decimal BaseQty, decimal Factor, decimal UnitCost)>();

        foreach (var line in request.Lines)
        {
            if (line.Quantity <= 0) { errors.Add("Quantity must be greater than zero."); continue; }
            if (line.UnitCost < 0) { errors.Add("Unit cost cannot be negative."); continue; }

            var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == line.ItemId, ct);
            if (item is null) { errors.Add("A selected item does not exist."); continue; }

            var itemUnit = await _db.ItemUnits.FirstOrDefaultAsync(u => u.ItemId == line.ItemId && u.UnitId == line.UnitId, ct);
            var factor = itemUnit?.ConversionFactor ?? (line.UnitId == item.BaseUnitId ? 1m : 0m);
            if (factor <= 0) { errors.Add($"Unit not configured for item '{item.Name}'."); continue; }

            var baseQty = line.Quantity * factor;
            var unitCostBase = factor > 0 ? line.UnitCost / factor : line.UnitCost;

            if (line.PurchaseOrderLineId is not null && po is not null)
            {
                var poLine = po.Lines.FirstOrDefault(l => l.Id == line.PurchaseOrderLineId);
                if (poLine is null) errors.Add("Purchase order line not found.");
                else if (poLine.ReceivedQuantity + baseQty > poLine.BaseQuantity)
                    errors.Add($"Receiving more than ordered for '{item.Name}'.");
            }

            lineData.Add((line, baseQty, factor, unitCostBase));
        }

        if (errors.Count > 0) return Result<GrnDto>.Failure(errors.ToArray());

        var grn = new GoodsReceivedNote
        {
            Number = await NextNumberAsync(ct),
            Date = request.Date,
            SupplierId = request.SupplierId,
            GodownId = request.GodownId,
            PurchaseOrderId = request.PurchaseOrderId,
            Status = GrnStatus.Posted,
            Notes = request.Notes
        };
        _db.GoodsReceivedNotes.Add(grn);

        foreach (var (line, baseQty, factor, unitCostBase) in lineData)
        {
            var lineCost = baseQty * unitCostBase;
            grn.Lines.Add(new GoodsReceivedNoteLine
            {
                PurchaseOrderLineId = line.PurchaseOrderLineId,
                ItemId = line.ItemId,
                UnitId = line.UnitId,
                Quantity = line.Quantity,
                ConversionFactor = factor,
                BaseQuantity = baseQty,
                UnitCost = unitCostBase,
                LineCost = lineCost
            });

            var item = await _db.Items.FirstAsync(i => i.Id == line.ItemId, ct);
            if (item.TrackInventory)
            {
                await StockPosting.ApplyMovementAsync(
                    _db, line.ItemId, request.GodownId, MovementType.Grn,
                    baseQty, unitCostBase, request.Date, grn.Number, "GRN receipt", ct);
            }

            if (line.PurchaseOrderLineId is not null && po is not null)
            {
                var poLine = po.Lines.First(l => l.Id == line.PurchaseOrderLineId);
                poLine.ReceivedQuantity += baseQty;
            }
        }

        if (po is not null)
        {
            var allReceived = po.Lines.All(l => l.ReceivedQuantity >= l.BaseQuantity - 0.0001m);
            var anyReceived = po.Lines.Any(l => l.ReceivedQuantity > 0);
            po.Status = allReceived ? PurchaseOrderStatus.Received
                : anyReceived ? PurchaseOrderStatus.PartiallyReceived
                : po.Status;
        }

        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("Created", "GRN", grn.Id, grn.Number, null, null, ct);
        return Result<GrnDto>.Success((await GetByIdAsync(grn.Id, ct))!);
    }

    private async Task<string> NextNumberAsync(CancellationToken ct)
    {
        var count = await _db.GoodsReceivedNotes.IgnoreQueryFilters().CountAsync(ct);
        return $"GRN-{count + 1:D5}";
    }

    private static GrnDto ToDto(GoodsReceivedNote g) =>
        new(g.Id, g.Number, g.Date, g.SupplierId, g.Supplier?.Name ?? string.Empty,
            g.GodownId, g.Godown?.Name ?? string.Empty,
            g.PurchaseOrderId, g.PurchaseOrder?.Number, g.Status, g.Notes,
            g.Lines.Select(l => new GrnLineDto(
                l.Id, l.ItemId, l.Item?.Code ?? string.Empty, l.Item?.Name ?? string.Empty,
                l.UnitId, l.Unit?.Code ?? string.Empty, l.Quantity, l.ConversionFactor, l.BaseQuantity,
                l.UnitCost, l.LineCost)).ToList());
}
