namespace AlHaram.Application.Units;

public record UnitDto(
    Guid Id,
    string Name,
    string Code,
    bool IsActive);

public record SaveUnitRequest(
    string Name,
    string Code,
    bool IsActive);

public interface IUnitService
{
    Task<IReadOnlyList<UnitDto>> GetAllAsync(CancellationToken ct = default);
    Task<UnitDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<UnitDto> CreateAsync(SaveUnitRequest request, CancellationToken ct = default);
    Task<UnitDto?> UpdateAsync(Guid id, SaveUnitRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
