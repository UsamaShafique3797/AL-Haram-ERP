using AlHaram.Application.Common.Models;
using AlHaram.Domain.Enums;

namespace AlHaram.Application.Sales;

public record PaymentAccountDto(
    Guid Id,
    string Name,
    PaymentAccountType Type,
    string? AccountNumber,
    string? BankName,
    decimal OpeningBalance,
    decimal CurrentBalance,
    bool IsDefault,
    bool IsActive);

public record SavePaymentAccountRequest(
    string Name,
    PaymentAccountType Type,
    string? AccountNumber,
    string? BankName,
    decimal OpeningBalance,
    bool IsDefault,
    bool IsActive);

public interface IPaymentAccountService
{
    Task<IReadOnlyList<PaymentAccountDto>> GetAllAsync(CancellationToken ct = default);
    Task<PaymentAccountDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<PaymentAccountDto>> CreateAsync(SavePaymentAccountRequest request, CancellationToken ct = default);
    Task<Result<PaymentAccountDto>> UpdateAsync(Guid id, SavePaymentAccountRequest request, CancellationToken ct = default);
}
