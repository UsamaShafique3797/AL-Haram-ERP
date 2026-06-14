namespace AlHaram.Application.Suppliers;

public record SupplierDto(
    Guid Id,
    string Name,
    string? Code,
    string? ContactPerson,
    string? Phone,
    string? Email,
    string? Address,
    string? TaxNumber,
    int PaymentTermsDays,
    decimal OpeningBalance,
    DateTime? OpeningBalanceAsOf,
    bool IsActive);

public record SaveSupplierRequest(
    string Name,
    string? Code,
    string? ContactPerson,
    string? Phone,
    string? Email,
    string? Address,
    string? TaxNumber,
    int PaymentTermsDays,
    decimal OpeningBalance,
    DateTime? OpeningBalanceAsOf,
    bool IsActive);

public interface ISupplierService
{
    Task<IReadOnlyList<SupplierDto>> GetAllAsync(CancellationToken ct = default);
    Task<SupplierDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<SupplierDto> CreateAsync(SaveSupplierRequest request, CancellationToken ct = default);
    Task<SupplierDto?> UpdateAsync(Guid id, SaveSupplierRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
