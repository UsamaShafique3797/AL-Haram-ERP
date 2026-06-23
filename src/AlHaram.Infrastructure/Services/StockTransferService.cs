using AlHaram.Application.Common;
using AlHaram.Application.Common.Models;
using AlHaram.Application.Stock;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Common;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class StockTransferService : IStockTransferService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogService _audit;
    private readonly IBranchScope _branch;

    public StockTransferService(AppDbContext db, IAuditLogService audit, IBranchScope branch)
    {
        _db = db;
        _audit = audit;
        _branch = branch;
    }

    public async Task<IReadOnlyList<StockTransferDto>> GetAllAsync(CancellationToken ct = default)
    {
        var list = await _db.StockTransfers
            .Include(t => t.FromGodown)
            .Include(t => t.ToGodown)
            .Include(t => t.Lines).ThenInclude(l => l.Item)
            .ForBranch(_branch)
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .ToListAsync(ct);
        return list.Select(ToDto).ToList();
    }

    public async Task<StockTransferDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var transfer = await _db.StockTransfers
            .Include(t => t.FromGodown)
            .Include(t => t.ToGodown)
            .Include(t => t.Lines).ThenInclude(l => l.Item)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
        return transfer is null ? null : ToDto(transfer);
    }

    public async Task<Result<StockTransferDto>> CreateAsync(SaveStockTransferRequest request, CancellationToken ct = default)
    {
        if (request.FromGodownId == request.ToGodownId)
            return Result<StockTransferDto>.Failure("Source and destination godowns must differ.");
        if (request.Lines is null || request.Lines.Count == 0)
            return Result<StockTransferDto>.Failure("Add at least one line.");

        if (!await _db.Godowns.AnyAsync(g => g.Id == request.FromGodownId, ct))
            return Result<StockTransferDto>.Failure("Source godown not found.");
        if (!await _db.Godowns.AnyAsync(g => g.Id == request.ToGodownId, ct))
            return Result<StockTransferDto>.Failure("Destination godown not found.");

        var errors = new List<string>();
        foreach (var line in request.Lines)
        {
            if (line.Quantity <= 0) { errors.Add("Quantity must be greater than zero."); continue; }
            if (!await _db.Items.AnyAsync(i => i.Id == line.ItemId, ct))
                errors.Add("A selected item does not exist.");
            else
            {
                var onHand = await StockPosting.GetOnHandAsync(_db, line.ItemId, request.FromGodownId, ct);
                if (line.Quantity > onHand)
                {
                    var name = await _db.Items.Where(i => i.Id == line.ItemId).Select(i => i.Name).FirstAsync(ct);
                    errors.Add($"Insufficient stock for '{name}' in source godown.");
                }
            }
        }

        if (errors.Count > 0) return Result<StockTransferDto>.Failure(errors.ToArray());

        var transfer = new StockTransfer
        {
            Number = await NextNumberAsync(ct),
            Date = request.Date,
            FromGodownId = request.FromGodownId,
            ToGodownId = request.ToGodownId,
            Status = StockTransferStatus.Draft,
            Notes = request.Notes
        };
        _db.StockTransfers.Add(transfer);

        foreach (var line in request.Lines)
        {
            var stock = await _db.StockItems.FirstOrDefaultAsync(
                s => s.ItemId == line.ItemId && s.GodownId == request.FromGodownId, ct);
            var unitCost = stock?.AverageCost ?? 0m;
            transfer.Lines.Add(new StockTransferLine
            {
                ItemId = line.ItemId,
                Quantity = line.Quantity,
                UnitCost = unitCost
            });
        }

        await _db.SaveChangesAsync(ct);
        return Result<StockTransferDto>.Success((await GetByIdAsync(transfer.Id, ct))!);
    }

    public async Task<Result<StockTransferDto>> CompleteAsync(Guid id, CancellationToken ct = default)
    {
        var transfer = await _db.StockTransfers.Include(t => t.Lines).FirstOrDefaultAsync(t => t.Id == id, ct);
        if (transfer is null) return Result<StockTransferDto>.Failure("Transfer not found.");
        if (transfer.Status == StockTransferStatus.Completed)
            return Result<StockTransferDto>.Failure("Transfer already completed.");
        if (transfer.Status == StockTransferStatus.Cancelled)
            return Result<StockTransferDto>.Failure("Cancelled transfers cannot be completed.");

        foreach (var line in transfer.Lines)
        {
            var onHand = await StockPosting.GetOnHandAsync(_db, line.ItemId, transfer.FromGodownId, ct);
            if (line.Quantity > onHand)
                return Result<StockTransferDto>.Failure("Insufficient stock to complete transfer.");

            await StockPosting.ApplyMovementAsync(
                _db, line.ItemId, transfer.FromGodownId, MovementType.TransferOut,
                -line.Quantity, 0m, transfer.Date, transfer.Number, "Transfer out", ct);

            await StockPosting.ApplyMovementAsync(
                _db, line.ItemId, transfer.ToGodownId, MovementType.TransferIn,
                line.Quantity, line.UnitCost, transfer.Date, transfer.Number, "Transfer in", ct);
        }

        transfer.Status = StockTransferStatus.Completed;
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("Completed", "StockTransfer", transfer.Id, transfer.Number, null, null, ct);
        return Result<StockTransferDto>.Success((await GetByIdAsync(id, ct))!);
    }

    private async Task<string> NextNumberAsync(CancellationToken ct)
    {
        var count = await _db.StockTransfers.IgnoreQueryFilters().CountAsync(ct);
        return $"ST-{count + 1:D5}";
    }

    private static StockTransferDto ToDto(StockTransfer t) =>
        new(t.Id, t.Number, t.Date, t.FromGodownId, t.FromGodown?.Name ?? string.Empty,
            t.ToGodownId, t.ToGodown?.Name ?? string.Empty, t.Status, t.Notes,
            t.Lines.Select(l => new StockTransferLineDto(
                l.Id, l.ItemId, l.Item?.Code ?? string.Empty, l.Item?.Name ?? string.Empty,
                l.Quantity, l.UnitCost)).ToList());
}
