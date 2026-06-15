using AlHaram.Application.Common.Models;
using AlHaram.Application.Production;
using AlHaram.Domain.Entities;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class BomService : IBomService
{
    private readonly AppDbContext _db;

    public BomService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<BillOfMaterialsDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.BillOfMaterials
            .Include(b => b.FinishedItem)
            .Include(b => b.Components).ThenInclude(c => c.RawItem)
            .OrderBy(b => b.FinishedItem!.Name)
            .Select(b => ToDto(b))
            .ToListAsync(ct);
    }

    public async Task<BillOfMaterialsDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var bom = await _db.BillOfMaterials
            .Include(b => b.FinishedItem)
            .Include(b => b.Components).ThenInclude(c => c.RawItem)
            .FirstOrDefaultAsync(b => b.Id == id, ct);
        return bom is null ? null : ToDto(bom);
    }

    public async Task<BillOfMaterialsDto?> GetByFinishedItemIdAsync(Guid finishedItemId, CancellationToken ct = default)
    {
        var bom = await _db.BillOfMaterials
            .Include(b => b.FinishedItem)
            .Include(b => b.Components).ThenInclude(c => c.RawItem)
            .FirstOrDefaultAsync(b => b.FinishedItemId == finishedItemId, ct);
        return bom is null ? null : ToDto(bom);
    }

    public async Task<Result<BillOfMaterialsDto>> CreateAsync(SaveBillOfMaterialsRequest request, CancellationToken ct = default)
    {
        var validation = await ValidateAsync(null, request, ct);
        if (!validation.Succeeded) return Result<BillOfMaterialsDto>.Failure(validation.Errors);

        var bom = new BillOfMaterials
        {
            FinishedItemId = request.FinishedItemId,
            Name = request.Name,
            Notes = request.Notes,
            IsActive = request.IsActive
        };
        _db.BillOfMaterials.Add(bom);

        foreach (var component in request.Components)
        {
            bom.Components.Add(new BomComponent
            {
                RawItemId = component.RawItemId,
                QuantityPerUnit = component.QuantityPerUnit,
                Notes = component.Notes
            });
        }

        await _db.SaveChangesAsync(ct);
        return Result<BillOfMaterialsDto>.Success((await GetByIdAsync(bom.Id, ct))!);
    }

    public async Task<Result<BillOfMaterialsDto>> UpdateAsync(Guid id, SaveBillOfMaterialsRequest request, CancellationToken ct = default)
    {
        var bom = await _db.BillOfMaterials
            .Include(b => b.Components)
            .FirstOrDefaultAsync(b => b.Id == id, ct);
        if (bom is null) return Result<BillOfMaterialsDto>.Failure("BOM not found.");

        var validation = await ValidateAsync(id, request, ct);
        if (!validation.Succeeded) return Result<BillOfMaterialsDto>.Failure(validation.Errors);

        bom.FinishedItemId = request.FinishedItemId;
        bom.Name = request.Name;
        bom.Notes = request.Notes;
        bom.IsActive = request.IsActive;

        _db.BomComponents.RemoveRange(bom.Components);
        bom.Components.Clear();

        foreach (var component in request.Components)
        {
            bom.Components.Add(new BomComponent
            {
                RawItemId = component.RawItemId,
                QuantityPerUnit = component.QuantityPerUnit,
                Notes = component.Notes
            });
        }

        await _db.SaveChangesAsync(ct);
        return Result<BillOfMaterialsDto>.Success((await GetByIdAsync(id, ct))!);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var bom = await _db.BillOfMaterials.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (bom is null) return false;

        var inUse = await _db.ProductionOrders.AnyAsync(o => o.BillOfMaterialsId == id, ct);
        if (inUse) return false;

        _db.BillOfMaterials.Remove(bom);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private async Task<Result<bool>> ValidateAsync(Guid? id, SaveBillOfMaterialsRequest request, CancellationToken ct)
    {
        if (request.Components is null || request.Components.Count == 0)
            return Result<bool>.Failure("Add at least one raw component.");

        if (!await _db.Items.AnyAsync(i => i.Id == request.FinishedItemId, ct))
            return Result<bool>.Failure("Finished item not found.");

        var duplicate = await _db.BillOfMaterials
            .AnyAsync(b => b.FinishedItemId == request.FinishedItemId && (id == null || b.Id != id), ct);
        if (duplicate)
            return Result<bool>.Failure("A BOM already exists for this finished item.");

        var errors = new List<string>();
        foreach (var component in request.Components)
        {
            if (component.QuantityPerUnit <= 0)
                errors.Add("Component quantity per unit must be greater than zero.");
            if (component.RawItemId == request.FinishedItemId)
                errors.Add("A finished item cannot be its own raw component.");

            if (!await _db.Items.AnyAsync(i => i.Id == component.RawItemId, ct))
                errors.Add("A selected raw item does not exist.");
        }

        if (request.Components.Select(c => c.RawItemId).Distinct().Count() != request.Components.Count)
            errors.Add("Duplicate raw items are not allowed on the same BOM.");

        return errors.Count > 0
            ? Result<bool>.Failure(errors.Distinct().ToArray())
            : Result<bool>.Success(true);
    }

    private static BillOfMaterialsDto ToDto(BillOfMaterials b) =>
        new(b.Id, b.FinishedItemId, b.FinishedItem?.Code ?? string.Empty, b.FinishedItem?.Name ?? string.Empty,
            b.Name, b.Notes, b.IsActive,
            b.Components.Select(c => new BomComponentDto(
                c.Id, c.RawItemId, c.RawItem?.Code ?? string.Empty, c.RawItem?.Name ?? string.Empty,
                c.QuantityPerUnit, c.Notes)).ToList());
}
