using AlHaram.Application.Common;
using AlHaram.Application.Godowns;
using AlHaram.Domain.Entities;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class GodownService : IGodownService
{
    private readonly AppDbContext _db;
    private readonly IBranchScope _branch;

    public GodownService(AppDbContext db, IBranchScope branch)
    {
        _db = db;
        _branch = branch;
    }

    public async Task<IReadOnlyList<GodownDto>> GetAllAsync(CancellationToken ct = default)
    {
        var query = _db.Godowns.AsQueryable();
        if (!_branch.CanAccessAllBranches)
            query = query.ForBranch(_branch);

        return await query
            .OrderByDescending(g => g.IsDefault)
            .ThenBy(g => g.Name)
            .Select(g => ToDto(g))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<GodownDto>> GetAllUnscopedAsync(CancellationToken ct = default)
    {
        return await _db.Godowns
            .OrderByDescending(g => g.IsDefault)
            .ThenBy(g => g.Name)
            .Select(g => ToDto(g))
            .ToListAsync(ct);
    }

    public async Task<GodownDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var g = await _db.Godowns.FirstOrDefaultAsync(x => x.Id == id, ct);
        return g is null ? null : ToDto(g);
    }

    public async Task<GodownDto> CreateAsync(SaveGodownRequest request, CancellationToken ct = default)
    {
        var godown = new Godown
        {
            Name = request.Name,
            Code = request.Code,
            Address = request.Address,
            Phone = request.Phone,
            IsActive = request.IsActive,
            IsDefault = request.IsDefault
        };

        if (request.IsDefault)
            await ClearDefaultAsync(ct);

        _db.Godowns.Add(godown);
        await _db.SaveChangesAsync(ct);
        return ToDto(godown);
    }

    public async Task<GodownDto?> UpdateAsync(Guid id, SaveGodownRequest request, CancellationToken ct = default)
    {
        var godown = await _db.Godowns.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (godown is null) return null;

        godown.Name = request.Name;
        godown.Code = request.Code;
        godown.Address = request.Address;
        godown.Phone = request.Phone;
        godown.IsActive = request.IsActive;

        if (request.IsDefault && !godown.IsDefault)
            await ClearDefaultAsync(ct);
        godown.IsDefault = request.IsDefault;

        await _db.SaveChangesAsync(ct);
        return ToDto(godown);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var godown = await _db.Godowns.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (godown is null) return false;

        _db.Godowns.Remove(godown); // soft delete via SaveChanges override
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private async Task ClearDefaultAsync(CancellationToken ct)
    {
        var current = await _db.Godowns.Where(g => g.IsDefault).ToListAsync(ct);
        foreach (var g in current) g.IsDefault = false;
    }

    private static GodownDto ToDto(Godown g) =>
        new(g.Id, g.Name, g.Code, g.Address, g.Phone, g.IsActive, g.IsDefault);
}
