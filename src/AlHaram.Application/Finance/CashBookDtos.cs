namespace AlHaram.Application.Finance;

public record CashBookEntryDto(
    DateTime Date,
    string Source,
    string? Reference,
    string? Notes,
    decimal MoneyIn,
    decimal MoneyOut,
    decimal Balance);

public record CashBookDto(
    Guid PaymentAccountId,
    string PaymentAccountName,
    string AccountType,
    decimal OpeningBalance,
    decimal TotalIn,
    decimal TotalOut,
    decimal ClosingBalance,
    IReadOnlyList<CashBookEntryDto> Entries);

public interface ICashBookService
{
    Task<IReadOnlyList<CashBookDto>> GetAllAsync(DateTime? from = null, DateTime? to = null, CancellationToken ct = default);
    Task<CashBookDto?> GetByAccountAsync(Guid paymentAccountId, DateTime? from = null, DateTime? to = null, CancellationToken ct = default);
}
