using AlHaram.Domain.Enums;

namespace AlHaram.Application.Customers;

public record CustomerDto(
    Guid Id,
    string Name,
    string? Code,
    string? ContactPerson,
    string? Phone,
    string? Email,
    string? Address,
    string? TaxNumber,
    CustomerType Type,
    decimal CreditLimit,
    int PaymentTermsDays,
    decimal OpeningBalance,
    DateTime? OpeningBalanceAsOf,
    bool IsActive);

public record SaveCustomerRequest(
    string Name,
    string? Code,
    string? ContactPerson,
    string? Phone,
    string? Email,
    string? Address,
    string? TaxNumber,
    CustomerType Type,
    decimal CreditLimit,
    int PaymentTermsDays,
    decimal OpeningBalance,
    DateTime? OpeningBalanceAsOf,
    bool IsActive);

public interface ICustomerService
{
    Task<IReadOnlyList<CustomerDto>> GetAllAsync(CancellationToken ct = default);
    Task<CustomerDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<CustomerDto> CreateAsync(SaveCustomerRequest request, CancellationToken ct = default);
    Task<CustomerDto?> UpdateAsync(Guid id, SaveCustomerRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
