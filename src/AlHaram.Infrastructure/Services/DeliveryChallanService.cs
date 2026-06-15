using AlHaram.Application.Common;
using AlHaram.Application.Common.Models;
using AlHaram.Application.Sales;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Common;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class DeliveryChallanService : IDeliveryChallanService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogService _audit;

    public DeliveryChallanService(AppDbContext db, IAuditLogService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<IReadOnlyList<DeliveryChallanDto>> GetAllAsync(Guid? customerId = null, CancellationToken ct = default)
    {
        var query = _db.DeliveryChallans
            .Include(c => c.Customer)
            .Include(c => c.Godown)
            .Include(c => c.SalesInvoice)
            .Include(c => c.Lines).ThenInclude(l => l.Item)
            .Include(c => c.Lines).ThenInclude(l => l.Unit)
            .AsQueryable();

        if (customerId is not null)
            query = query.Where(c => c.CustomerId == customerId);

        var list = await query.OrderByDescending(c => c.Date).ThenByDescending(c => c.CreatedAt).ToListAsync(ct);
        return list.Select(ToDto).ToList();
    }

    public async Task<DeliveryChallanDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var challan = await _db.DeliveryChallans
            .Include(c => c.Customer)
            .Include(c => c.Godown)
            .Include(c => c.SalesInvoice)
            .Include(c => c.Lines).ThenInclude(l => l.Item)
            .Include(c => c.Lines).ThenInclude(l => l.Unit)
            .FirstOrDefaultAsync(c => c.Id == id, ct);
        return challan is null ? null : ToDto(challan);
    }

    public async Task<Result<DeliveryChallanDto>> CreateAsync(SaveDeliveryChallanRequest request, CancellationToken ct = default)
    {
        if (request.Lines is null || request.Lines.Count == 0)
            return Result<DeliveryChallanDto>.Failure("Add at least one line.");

        if (!await _db.Customers.AnyAsync(c => c.Id == request.CustomerId, ct))
            return Result<DeliveryChallanDto>.Failure("Customer not found.");
        if (!await _db.Godowns.AnyAsync(g => g.Id == request.GodownId, ct))
            return Result<DeliveryChallanDto>.Failure("Godown not found.");

        if (request.SalesInvoiceId is not null &&
            !await _db.SalesInvoices.AnyAsync(i => i.Id == request.SalesInvoiceId, ct))
            return Result<DeliveryChallanDto>.Failure("Linked sales invoice not found.");

        var errors = new List<string>();
        var lineData = new List<(SaveDeliveryChallanLineRequest Line, decimal BaseQty, decimal Factor)>();

        foreach (var line in request.Lines)
        {
            if (line.Quantity <= 0) { errors.Add("Quantity must be greater than zero."); continue; }

            var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == line.ItemId, ct);
            if (item is null) { errors.Add("A selected item does not exist."); continue; }

            var itemUnit = await _db.ItemUnits.FirstOrDefaultAsync(u => u.ItemId == line.ItemId && u.UnitId == line.UnitId, ct);
            var factor = itemUnit?.ConversionFactor ?? (line.UnitId == item.BaseUnitId ? 1m : 0m);
            if (factor <= 0) { errors.Add($"Unit not configured for item '{item.Name}'."); continue; }

            var baseQty = line.Quantity * factor;
            if (item.TrackInventory)
            {
                var onHand = await StockPosting.GetOnHandAsync(_db, item.Id, request.GodownId, ct);
                if (baseQty > onHand)
                    errors.Add($"Insufficient stock for '{item.Name}': need {baseQty}, have {onHand}.");
            }

            lineData.Add((line, baseQty, factor));
        }

        if (errors.Count > 0) return Result<DeliveryChallanDto>.Failure(errors.ToArray());

        var challan = new DeliveryChallan
        {
            Number = await NextNumberAsync(ct),
            Date = request.Date,
            CustomerId = request.CustomerId,
            GodownId = request.GodownId,
            SalesInvoiceId = request.SalesInvoiceId,
            Status = DeliveryChallanStatus.Posted,
            VehicleNo = request.VehicleNo,
            DriverName = request.DriverName,
            Notes = request.Notes
        };
        _db.DeliveryChallans.Add(challan);

        foreach (var (line, baseQty, factor) in lineData)
        {
            challan.Lines.Add(new DeliveryChallanLine
            {
                ItemId = line.ItemId,
                UnitId = line.UnitId,
                Quantity = line.Quantity,
                ConversionFactor = factor,
                BaseQuantity = baseQty
            });

            var item = await _db.Items.FirstAsync(i => i.Id == line.ItemId, ct);
            if (item.TrackInventory)
            {
                await StockPosting.ApplyMovementAsync(
                    _db, line.ItemId, request.GodownId, MovementType.DeliveryChallan,
                    -baseQty, 0m, request.Date, challan.Number, "Delivery challan", ct);
            }
        }

        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("Created", "DeliveryChallan", challan.Id, challan.Number, null, null, ct);
        return Result<DeliveryChallanDto>.Success((await GetByIdAsync(challan.Id, ct))!);
    }

    private async Task<string> NextNumberAsync(CancellationToken ct)
    {
        var count = await _db.DeliveryChallans.IgnoreQueryFilters().CountAsync(ct);
        return $"DC-{count + 1:D5}";
    }

    private static DeliveryChallanDto ToDto(DeliveryChallan c) =>
        new(c.Id, c.Number, c.Date, c.CustomerId, c.Customer?.Name ?? string.Empty,
            c.GodownId, c.Godown?.Name ?? string.Empty,
            c.SalesInvoiceId, c.SalesInvoice?.Number,
            c.Status, c.VehicleNo, c.DriverName, c.Notes,
            c.Lines.Select(l => new DeliveryChallanLineDto(
                l.Id, l.ItemId, l.Item?.Code ?? string.Empty, l.Item?.Name ?? string.Empty,
                l.UnitId, l.Unit?.Code ?? string.Empty, l.Quantity, l.ConversionFactor, l.BaseQuantity)).ToList());
}
