namespace AlHaram.Application.Finance;

public record ProfitLossCategoryBreakdownDto(string Name, decimal Amount);

public record ProfitLossItemBreakdownDto(
    Guid ItemId,
    string ItemCode,
    string ItemName,
    decimal Revenue,
    decimal Cost,
    decimal GrossProfit);

public record ProfitLossDto(
    DateTime From,
    DateTime To,
    decimal Revenue,
    decimal SalesReturns,
    decimal NetRevenue,
    decimal CostOfGoodsSold,
    decimal GrossProfit,
    decimal Expenses,
    decimal NetProfit,
    IReadOnlyList<ProfitLossCategoryBreakdownDto> ExpenseByCategory,
    IReadOnlyList<ProfitLossItemBreakdownDto> ItemBreakdown);

public interface IProfitLossService
{
    Task<ProfitLossDto> GetAsync(DateTime from, DateTime to, bool includeBreakdown = true, CancellationToken ct = default);
}
