using AlHaram.Application.Units;
using AlHaram.Domain.Entities;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class UnitService : IUnitService
{
    private readonly AppDbContext _db;

    public UnitService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<UnitDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.Units
            .OrderBy(u => u.Name)
            .Select(u => new UnitDto(u.Id, u.Name, u.Code, u.IsActive))
            .ToListAsync(ct);
    }

    public async Task<UnitDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var u = await _db.Units.FirstOrDefaultAsync(x => x.Id == id, ct);
        return u is null ? null : new UnitDto(u.Id, u.Name, u.Code, u.IsActive);
    }

    public async Task<UnitDto> CreateAsync(SaveUnitRequest request, CancellationToken ct = default)
    {
        var unit = new Unit { Name = request.Name, Code = request.Code, IsActive = request.IsActive };
        _db.Units.Add(unit);
        await _db.SaveChangesAsync(ct);
        return new UnitDto(unit.Id, unit.Name, unit.Code, unit.IsActive);
    }

    public async Task<UnitDto?> UpdateAsync(Guid id, SaveUnitRequest request, CancellationToken ct = default)
    {
        var unit = await _db.Units.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (unit is null) return null;

        unit.Name = request.Name;
        unit.Code = request.Code;
        unit.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);
        return new UnitDto(unit.Id, unit.Name, unit.Code, unit.IsActive);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var unit = await _db.Units.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (unit is null) return false;

        _db.Units.Remove(unit);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
