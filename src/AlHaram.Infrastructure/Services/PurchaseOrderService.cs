using AlHaram.Application.Common;
using AlHaram.Application.Common.Models;
using AlHaram.Application.Purchasing;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class PurchaseOrderService : IPurchaseOrderService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogService _audit;

    public PurchaseOrderService(AppDbContext db, IAuditLogService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<IReadOnlyList<PurchaseOrderDto>> GetAllAsync(Guid? supplierId = null, CancellationToken ct = default)
    {
        var query = _db.PurchaseOrders
            .Include(o => o.Supplier)
            .Include(o => o.Godown)
            .Include(o => o.Lines).ThenInclude(l => l.Item)
            .Include(o => o.Lines).ThenInclude(l => l.Unit)
            .AsQueryable();

        if (supplierId is not null)
            query = query.Where(o => o.SupplierId == supplierId);

        var list = await query.OrderByDescending(o => o.Date).ThenByDescending(o => o.CreatedAt).ToListAsync(ct);
        return list.Select(ToDto).ToList();
    }

    public async Task<PurchaseOrderDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var order = await _db.PurchaseOrders
            .Include(o => o.Supplier)
            .Include(o => o.Godown)
            .Include(o => o.Lines).ThenInclude(l => l.Item)
            .Include(o => o.Lines).ThenInclude(l => l.Unit)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
        return order is null ? null : ToDto(order);
    }

    public async Task<Result<PurchaseOrderDto>> CreateAsync(SavePurchaseOrderRequest request, CancellationToken ct = default)
    {
        if (request.Lines is null || request.Lines.Count == 0)
            return Result<PurchaseOrderDto>.Failure("Add at least one line.");

        if (!await _db.Suppliers.AnyAsync(s => s.Id == request.SupplierId, ct))
            return Result<PurchaseOrderDto>.Failure("Supplier not found.");
        if (!await _db.Godowns.AnyAsync(g => g.Id == request.GodownId, ct))
            return Result<PurchaseOrderDto>.Failure("Godown not found.");

        var errors = new List<string>();
        decimal subtotal = 0m;
        var lines = new List<PurchaseOrderLine>();

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
            lines.Add(new PurchaseOrderLine
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

        if (errors.Count > 0) return Result<PurchaseOrderDto>.Failure(errors.ToArray());

        var taxAmount = (subtotal - request.Discount) * request.TaxRate / 100m;
        var total = subtotal - request.Discount + taxAmount;

        var order = new PurchaseOrder
        {
            Number = await NextNumberAsync(ct),
            Date = request.Date,
            ExpectedDate = request.ExpectedDate,
            SupplierId = request.SupplierId,
            GodownId = request.GodownId,
            Status = PurchaseOrderStatus.Draft,
            Subtotal = subtotal,
            Discount = request.Discount,
            TaxRate = request.TaxRate,
            TaxAmount = taxAmount,
            Total = total,
            Notes = request.Notes,
            Lines = lines
        };
        _db.PurchaseOrders.Add(order);
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("Created", "PurchaseOrder", order.Id, order.Number, null, null, ct);
        return Result<PurchaseOrderDto>.Success((await GetByIdAsync(order.Id, ct))!);
    }

    public async Task<Result<PurchaseOrderDto>> UpdateStatusAsync(Guid id, PurchaseOrderStatus status, CancellationToken ct = default)
    {
        var order = await _db.PurchaseOrders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null) return Result<PurchaseOrderDto>.Failure("Purchase order not found.");
        if (order.Status == PurchaseOrderStatus.Cancelled)
            return Result<PurchaseOrderDto>.Failure("Cancelled orders cannot be updated.");

        order.Status = status;
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("StatusChanged", "PurchaseOrder", order.Id, order.Number, null, status.ToString(), ct);
        return Result<PurchaseOrderDto>.Success((await GetByIdAsync(id, ct))!);
    }

    private async Task<string> NextNumberAsync(CancellationToken ct)
    {
        var count = await _db.PurchaseOrders.IgnoreQueryFilters().CountAsync(ct);
        return $"PO-{count + 1:D5}";
    }

    private static PurchaseOrderDto ToDto(PurchaseOrder o) =>
        new(o.Id, o.Number, o.Date, o.ExpectedDate, o.SupplierId, o.Supplier?.Name ?? string.Empty,
            o.GodownId, o.Godown?.Name ?? string.Empty, o.Status,
            o.Subtotal, o.Discount, o.TaxRate, o.TaxAmount, o.Total, o.Notes,
            o.Lines.Select(l => new PurchaseOrderLineDto(
                l.Id, l.ItemId, l.Item?.Code ?? string.Empty, l.Item?.Name ?? string.Empty,
                l.UnitId, l.Unit?.Code ?? string.Empty, l.Quantity, l.ConversionFactor, l.BaseQuantity,
                l.Rate, l.Discount, l.LineTotal, l.ReceivedQuantity, l.BaseQuantity - l.ReceivedQuantity)).ToList());
}
