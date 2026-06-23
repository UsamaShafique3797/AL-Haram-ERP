using AlHaram.Application.Common;
using AlHaram.Application.Common.Models;
using AlHaram.Application.Items;
using AlHaram.Domain.Entities;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class ItemService : IItemService
{
    private readonly AppDbContext _db;
    private readonly IBranchScope _branch;

    public ItemService(AppDbContext db, IBranchScope branch)
    {
        _db = db;
        _branch = branch;
    }

    public async Task<IReadOnlyList<ItemDto>> GetAllAsync(CancellationToken ct = default)
    {
        var items = await QueryWithIncludes().OrderBy(i => i.Name).ToListAsync(ct);
        var stock = await GetStockTotalsAsync(ct);
        return items.Select(i => ToDto(i, stock)).ToList();
    }

    public async Task<ItemDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var item = await QueryWithIncludes().FirstOrDefaultAsync(i => i.Id == id, ct);
        if (item is null) return null;
        var stock = await GetStockTotalsAsync(ct, id);
        return ToDto(item, stock);
    }

    public async Task<Result<ItemDto>> CreateAsync(SaveItemRequest request, CancellationToken ct = default)
    {
        var validation = await ValidateAsync(request, null, ct);
        if (!validation.Succeeded) return Result<ItemDto>.Failure(validation.Errors);

        var item = new Item();
        Apply(item, request);
        BuildItemUnits(item, request);

        _db.Items.Add(item);
        await _db.SaveChangesAsync(ct);

        var created = await GetByIdAsync(item.Id, ct);
        return Result<ItemDto>.Success(created!);
    }

    public async Task<Result<ItemDto>> UpdateAsync(Guid id, SaveItemRequest request, CancellationToken ct = default)
    {
        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (item is null) return Result<ItemDto>.Failure("Item not found.");

        var validation = await ValidateAsync(request, id, ct);
        if (!validation.Succeeded) return Result<ItemDto>.Failure(validation.Errors);

        Apply(item, request);

        var existingUnits = await _db.ItemUnits.IgnoreQueryFilters()
            .Where(iu => iu.ItemId == id)
            .ToListAsync(ct);

        SyncItemUnits(item.Id, existingUnits, request);

        await _db.SaveChangesAsync(ct);

        var updated = await GetByIdAsync(item.Id, ct);
        return Result<ItemDto>.Success(updated!);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (item is null) return false;

        _db.Items.Remove(item);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    // ---- helpers ------------------------------------------------------------

    private IQueryable<Item> QueryWithIncludes() =>
        _db.Items
            .Include(i => i.Category)
            .Include(i => i.BaseUnit)
            .Include(i => i.ItemUnits).ThenInclude(iu => iu.Unit);

    private async Task<Result> ValidateAsync(SaveItemRequest request, Guid? id, CancellationToken ct)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.Code))
            errors.Add("Item code is required.");
        else if (await _db.Items.AnyAsync(i => i.Code == request.Code && i.Id != id, ct))
            errors.Add($"An item with code '{request.Code}' already exists.");

        if (!await _db.Categories.AnyAsync(c => c.Id == request.CategoryId, ct))
            errors.Add("Selected category does not exist.");

        if (!await _db.Units.AnyAsync(u => u.Id == request.BaseUnitId, ct))
            errors.Add("Selected base unit does not exist.");

        foreach (var au in request.AdditionalUnits ?? new List<SaveItemUnitRequest>())
        {
            if (au.ConversionFactor <= 0)
                errors.Add("Conversion factor must be greater than zero.");
            if (!await _db.Units.AnyAsync(u => u.Id == au.UnitId, ct))
                errors.Add("A selected secondary unit does not exist.");
        }

        return errors.Count == 0 ? Result.Success() : Result.Failure(errors.ToArray());
    }

    private static void Apply(Item item, SaveItemRequest request)
    {
        item.Code = request.Code.Trim();
        item.Name = request.Name.Trim();
        item.CategoryId = request.CategoryId;
        item.Brand = request.Brand;
        item.HsCode = request.HsCode;
        item.BaseUnitId = request.BaseUnitId;
        item.DefaultPurchaseRate = request.DefaultPurchaseRate;
        item.DefaultSaleRate = request.DefaultSaleRate;
        item.ReorderLevel = request.ReorderLevel;
        item.Diameter = request.Diameter;
        item.Grade = request.Grade;
        item.Length = request.Length;
        item.WeightPerPiece = request.WeightPerPiece;
        item.TrackInventory = request.TrackInventory;
        item.IsActive = request.IsActive;
    }

    private static void BuildItemUnits(Item item, SaveItemRequest request)
    {
        item.ItemUnits.Add(new ItemUnit
        {
            UnitId = request.BaseUnitId,
            ConversionFactor = 1m,
            IsBaseUnit = true
        });

        foreach (var au in (request.AdditionalUnits ?? new List<SaveItemUnitRequest>())
                     .Where(u => u.UnitId != request.BaseUnitId))
        {
            item.ItemUnits.Add(new ItemUnit
            {
                UnitId = au.UnitId,
                ConversionFactor = au.ConversionFactor,
                IsBaseUnit = false
            });
        }
    }

    /// <summary>
    /// Updates item-unit rows in place. Avoids RemoveRange + soft-delete, which causes
    /// EF Core concurrency failures and unique-index conflicts on (ItemId, UnitId).
    /// </summary>
    private void SyncItemUnits(Guid itemId, List<ItemUnit> existing, SaveItemRequest request)
    {
        var desired = new List<(Guid UnitId, decimal Factor, bool IsBase)>
        {
            (request.BaseUnitId, 1m, true)
        };

        foreach (var au in request.AdditionalUnits ?? Array.Empty<SaveItemUnitRequest>())
        {
            if (au.UnitId != request.BaseUnitId)
                desired.Add((au.UnitId, au.ConversionFactor, false));
        }

        var desiredIds = desired.Select(d => d.UnitId).ToHashSet();

        foreach (var row in existing)
        {
            if (desiredIds.Contains(row.UnitId))
            {
                var match = desired.First(d => d.UnitId == row.UnitId);
                row.ConversionFactor = match.Factor;
                row.IsBaseUnit = match.IsBase;
                row.IsDeleted = false;
            }
            else
            {
                row.IsDeleted = true;
            }
        }

        foreach (var d in desired)
        {
            if (existing.All(e => e.UnitId != d.UnitId))
            {
                _db.ItemUnits.Add(new ItemUnit
                {
                    ItemId = itemId,
                    UnitId = d.UnitId,
                    ConversionFactor = d.Factor,
                    IsBaseUnit = d.IsBase,
                });
            }
        }
    }

    private async Task<Dictionary<Guid, (decimal Qty, decimal Value)>> GetStockTotalsAsync(
        CancellationToken ct, Guid? itemId = null)
    {
        var query = _db.StockItems.AsQueryable();
        if (itemId is not null) query = query.Where(s => s.ItemId == itemId);
        if (_branch.EffectiveGodownId is Guid gid) query = query.Where(s => s.GodownId == gid);

        var totals = await query
            .GroupBy(s => s.ItemId)
            .Select(g => new
            {
                ItemId = g.Key,
                Qty = g.Sum(x => x.Quantity),
                Value = g.Sum(x => x.Quantity * x.AverageCost)
            })
            .ToListAsync(ct);

        return totals.ToDictionary(t => t.ItemId, t => (t.Qty, t.Value));
    }

    private static ItemDto ToDto(Item i, Dictionary<Guid, (decimal Qty, decimal Value)> stock)
    {
        var (qty, value) = stock.TryGetValue(i.Id, out var s) ? s : (0m, 0m);
        var isLow = i.TrackInventory && i.ReorderLevel > 0 && qty < i.ReorderLevel;

        var units = i.ItemUnits
            .OrderByDescending(u => u.IsBaseUnit)
            .Select(u => new ItemUnitDto(
                u.UnitId,
                u.Unit?.Name ?? string.Empty,
                u.Unit?.Code ?? string.Empty,
                u.ConversionFactor,
                u.IsBaseUnit))
            .ToList();

        return new ItemDto(
            i.Id, i.Code, i.Name,
            i.CategoryId, i.Category?.Name ?? string.Empty,
            i.Brand, i.HsCode,
            i.BaseUnitId, i.BaseUnit?.Code ?? string.Empty,
            i.DefaultPurchaseRate, i.DefaultSaleRate, i.ReorderLevel,
            i.Diameter, i.Grade, i.Length, i.WeightPerPiece,
            i.TrackInventory, i.IsActive,
            qty, value, isLow,
            units);
    }
}
