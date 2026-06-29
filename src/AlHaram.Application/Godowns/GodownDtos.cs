namespace AlHaram.Application.Godowns;

public record GodownDto(
    Guid Id,
    string Name,
    string? Code,
    string? Address,
    string? Phone,
    bool IsActive,
    bool IsDefault);

public record SaveGodownRequest(
    string Name,
    string? Code,
    string? Address,
    string? Phone,
    bool IsActive,
    bool IsDefault);

public interface IGodownService
{
    Task<IReadOnlyList<GodownDto>> GetAllAsync(CancellationToken ct = default);

    /// <summary>All godowns regardless of the caller's branch scope (e.g. stock transfer destinations).</summary>
    Task<IReadOnlyList<GodownDto>> GetAllUnscopedAsync(CancellationToken ct = default);
    Task<GodownDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<GodownDto> CreateAsync(SaveGodownRequest request, CancellationToken ct = default);
    Task<GodownDto?> UpdateAsync(Guid id, SaveGodownRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
