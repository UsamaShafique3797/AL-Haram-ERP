using AlHaram.Application.Categories;
using AlHaram.Domain.Entities;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class CategoryService : ICategoryService
{
    private readonly AppDbContext _db;

    public CategoryService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<CategoryDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.Categories
            .OrderBy(c => c.Name)
            .Select(c => new CategoryDto(
                c.Id, c.Name, c.Code, c.Description, c.IsActive,
                _db.Items.Count(i => i.CategoryId == c.Id)))
            .ToListAsync(ct);
    }

    public async Task<CategoryDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Categories
            .Where(c => c.Id == id)
            .Select(c => new CategoryDto(
                c.Id, c.Name, c.Code, c.Description, c.IsActive,
                _db.Items.Count(i => i.CategoryId == c.Id)))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<CategoryDto> CreateAsync(SaveCategoryRequest request, CancellationToken ct = default)
    {
        var category = new Category
        {
            Name = request.Name,
            Code = request.Code,
            Description = request.Description,
            IsActive = request.IsActive
        };
        _db.Categories.Add(category);
        await _db.SaveChangesAsync(ct);
        return new CategoryDto(category.Id, category.Name, category.Code, category.Description, category.IsActive, 0);
    }

    public async Task<CategoryDto?> UpdateAsync(Guid id, SaveCategoryRequest request, CancellationToken ct = default)
    {
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (category is null) return null;

        category.Name = request.Name;
        category.Code = request.Code;
        category.Description = request.Description;
        category.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);

        var itemCount = await _db.Items.CountAsync(i => i.CategoryId == id, ct);
        return new CategoryDto(category.Id, category.Name, category.Code, category.Description, category.IsActive, itemCount);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (category is null) return false;

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
