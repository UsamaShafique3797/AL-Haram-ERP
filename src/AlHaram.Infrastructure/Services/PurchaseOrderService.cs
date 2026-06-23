using AlHaram.Application.Common;
using AlHaram.Application.Common.Models;
using AlHaram.Application.Purchasing;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class PurchaseOrderService : IPurchaseOrderService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogService _audit;
    private readonly IBranchScope _branch;

    public PurchaseOrderService(AppDbContext db, IAuditLogService audit, IBranchScope branch)
    {
        _db = db;
        _audit = audit;
        _branch = branch;
    }

    public async Task<IReadOnlyList<PurchaseOrderDto>> GetAllAsync(Guid? supplierId = null, CancellationToken ct = default)
    {
        var query = _db.PurchaseOrders
            .Include(o => o.Supplier)
            .Include(o => o.Godown)
            .Include(o => o.Lines).ThenInclude(l => l.Item)
            .Include(o => o.Lines).ThenInclude(l => l.Unit)
            .AsQueryable()
            .ForBranch(_branch);

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
        var build = await BuildLinesAsync(request, ct);
        if (!build.Succeeded) return Result<PurchaseOrderDto>.Failure(build.Errors);

        var taxAmount = (build.Subtotal - request.Discount) * request.TaxRate / 100m;
        var total = build.Subtotal - request.Discount + taxAmount;

        var order = new PurchaseOrder
        {
            Number = await NextNumberAsync(ct),
            Date = request.Date,
            ExpectedDate = request.ExpectedDate,
            SupplierId = request.SupplierId,
            GodownId = request.GodownId,
            Status = PurchaseOrderStatus.Draft,
            Subtotal = build.Subtotal,
            Discount = request.Discount,
            TaxRate = request.TaxRate,
            TaxAmount = taxAmount,
            Total = total,
            Notes = request.Notes,
            Lines = build.Lines
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

    public async Task<Result<PurchaseOrderDto>> UpdateAsync(Guid id, SavePurchaseOrderRequest request, CancellationToken ct = default)
    {
        var order = await _db.PurchaseOrders.Include(o => o.Lines).FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null) return Result<PurchaseOrderDto>.Failure("Purchase order not found.");
        if (order.Status != PurchaseOrderStatus.Draft)
            return Result<PurchaseOrderDto>.Failure("Only draft purchase orders can be edited.");

        var build = await BuildLinesAsync(request, ct);
        if (!build.Succeeded) return Result<PurchaseOrderDto>.Failure(build.Errors);

        order.Date = request.Date;
        order.ExpectedDate = request.ExpectedDate;
        order.SupplierId = request.SupplierId;
        order.GodownId = request.GodownId;
        order.Subtotal = build.Subtotal;
        order.Discount = request.Discount;
        order.TaxRate = request.TaxRate;
        order.TaxAmount = (build.Subtotal - request.Discount) * request.TaxRate / 100m;
        order.Total = build.Subtotal - request.Discount + order.TaxAmount;
        order.Notes = request.Notes;

        _db.PurchaseOrderLines.RemoveRange(order.Lines);
        order.Lines = build.Lines;

        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("Updated", "PurchaseOrder", order.Id, order.Number, null, null, ct);
        return Result<PurchaseOrderDto>.Success((await GetByIdAsync(id, ct))!);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var order = await _db.PurchaseOrders.Include(o => o.Lines).FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null || order.Status != PurchaseOrderStatus.Draft) return false;

        _db.PurchaseOrderLines.RemoveRange(order.Lines);
        _db.PurchaseOrders.Remove(order);
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("Deleted", "PurchaseOrder", id, order.Number, null, null, ct);
        return true;
    }

    private async Task<(bool Succeeded, string[] Errors, decimal Subtotal, List<PurchaseOrderLine> Lines)> BuildLinesAsync(
        SavePurchaseOrderRequest request, CancellationToken ct)
    {
        if (request.Lines is null || request.Lines.Count == 0)
            return (false, new[] { "Add at least one line." }, 0m, new List<PurchaseOrderLine>());

        if (!await _db.Suppliers.AnyAsync(s => s.Id == request.SupplierId, ct))
            return (false, new[] { "Supplier not found." }, 0m, new List<PurchaseOrderLine>());
        if (!await _db.Godowns.AnyAsync(g => g.Id == request.GodownId, ct))
            return (false, new[] { "Godown not found." }, 0m, new List<PurchaseOrderLine>());

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

        if (errors.Count > 0) return (false, errors.ToArray(), 0m, lines);
        return (true, Array.Empty<string>(), subtotal, lines);
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
