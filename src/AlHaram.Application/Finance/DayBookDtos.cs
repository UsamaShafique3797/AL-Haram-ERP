namespace AlHaram.Application.Finance;

public record DayBookEntryDto(
    Guid PaymentAccountId,
    string PaymentAccountName,
    string AccountType,
    DateTime Date,
    string Source,
    string? Reference,
    string? Notes,
    decimal MoneyIn,
    decimal MoneyOut);

public record DayBookDto(
    DateTime Date,
    decimal TotalIn,
    decimal TotalOut,
    decimal NetMovement,
    IReadOnlyList<DayBookEntryDto> Entries);

public interface IDayBookService
{
    Task<DayBookDto> GetForDateAsync(DateTime date, CancellationToken ct = default);
}
