namespace AlHaram.Application.Finance;

public record ExpenseCategoryDto(
    Guid Id,
    string Name,
    string? Code,
    string? Description,
    bool IsActive,
    int ExpenseCount);

public record SaveExpenseCategoryRequest(
    string Name,
    string? Code,
    string? Description,
    bool IsActive);

public interface IExpenseCategoryService
{
    Task<IReadOnlyList<ExpenseCategoryDto>> GetAllAsync(CancellationToken ct = default);
    Task<ExpenseCategoryDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ExpenseCategoryDto> CreateAsync(SaveExpenseCategoryRequest request, CancellationToken ct = default);
    Task<ExpenseCategoryDto?> UpdateAsync(Guid id, SaveExpenseCategoryRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
