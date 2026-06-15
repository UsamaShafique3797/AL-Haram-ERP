using AlHaram.Application.Finance;
using AlHaram.Domain.Entities;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class ExpenseCategoryService : IExpenseCategoryService
{
    private readonly AppDbContext _db;

    public ExpenseCategoryService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<ExpenseCategoryDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.ExpenseCategories
            .OrderBy(c => c.Name)
            .Select(c => new ExpenseCategoryDto(
                c.Id, c.Name, c.Code, c.Description, c.IsActive,
                _db.Expenses.Count(e => e.ExpenseCategoryId == c.Id)))
            .ToListAsync(ct);
    }

    public async Task<ExpenseCategoryDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.ExpenseCategories
            .Where(c => c.Id == id)
            .Select(c => new ExpenseCategoryDto(
                c.Id, c.Name, c.Code, c.Description, c.IsActive,
                _db.Expenses.Count(e => e.ExpenseCategoryId == c.Id)))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<ExpenseCategoryDto> CreateAsync(SaveExpenseCategoryRequest request, CancellationToken ct = default)
    {
        var category = new ExpenseCategory
        {
            Name = request.Name.Trim(),
            Code = request.Code,
            Description = request.Description,
            IsActive = request.IsActive
        };
        _db.ExpenseCategories.Add(category);
        await _db.SaveChangesAsync(ct);
        return new ExpenseCategoryDto(category.Id, category.Name, category.Code, category.Description, category.IsActive, 0);
    }

    public async Task<ExpenseCategoryDto?> UpdateAsync(Guid id, SaveExpenseCategoryRequest request, CancellationToken ct = default)
    {
        var category = await _db.ExpenseCategories.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (category is null) return null;

        category.Name = request.Name.Trim();
        category.Code = request.Code;
        category.Description = request.Description;
        category.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);

        var count = await _db.Expenses.CountAsync(e => e.ExpenseCategoryId == id, ct);
        return new ExpenseCategoryDto(category.Id, category.Name, category.Code, category.Description, category.IsActive, count);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var category = await _db.ExpenseCategories.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (category is null) return false;

        if (await _db.Expenses.AnyAsync(e => e.ExpenseCategoryId == id, ct))
            return false;

        _db.ExpenseCategories.Remove(category);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
