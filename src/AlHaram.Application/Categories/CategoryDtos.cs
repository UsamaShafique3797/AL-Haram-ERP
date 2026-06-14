namespace AlHaram.Application.Categories;

public record CategoryDto(
    Guid Id,
    string Name,
    string? Code,
    string? Description,
    bool IsActive,
    int ItemCount);

public record SaveCategoryRequest(
    string Name,
    string? Code,
    string? Description,
    bool IsActive);

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDto>> GetAllAsync(CancellationToken ct = default);
    Task<CategoryDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<CategoryDto> CreateAsync(SaveCategoryRequest request, CancellationToken ct = default);
    Task<CategoryDto?> UpdateAsync(Guid id, SaveCategoryRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
