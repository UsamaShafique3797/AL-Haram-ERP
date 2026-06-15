namespace AlHaram.Application.Finance;

public record DashboardSummaryDto(
    decimal SalesMonth,
    decimal PurchasesMonth,
    decimal ExpensesMonth,
    decimal CashBalance,
    decimal BankBalance,
    decimal Receivables,
    decimal Payables,
    decimal NetProfitMonth);

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default);
}
