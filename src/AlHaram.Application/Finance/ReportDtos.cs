namespace AlHaram.Application.Finance;

public record SalesReportLineDto(
    Guid InvoiceId,
    string Number,
    DateTime Date,
    string CustomerName,
    decimal Subtotal,
    decimal Discount,
    decimal TaxAmount,
    decimal Total,
    decimal PaidAmount,
    decimal Balance,
    decimal CostOfGoodsSold,
    decimal GrossProfit);

public record SalesReportDto(
    DateTime From,
    DateTime To,
    int InvoiceCount,
    decimal TotalRevenue,
    decimal TotalCost,
    decimal TotalGrossProfit,
    IReadOnlyList<SalesReportLineDto> Lines);

public record PurchaseReportLineDto(
    Guid InvoiceId,
    string Number,
    DateTime Date,
    string SupplierName,
    decimal Subtotal,
    decimal Discount,
    decimal TaxAmount,
    decimal Total,
    decimal PaidAmount,
    decimal Balance);

public record PurchaseReportDto(
    DateTime From,
    DateTime To,
    string Message,
    int InvoiceCount,
    decimal TotalAmount,
    IReadOnlyList<PurchaseReportLineDto> Lines);

public record StockValuationLineDto(
    Guid ItemId,
    string ItemCode,
    string ItemName,
    string CategoryName,
    decimal Quantity,
    string UnitCode,
    decimal AverageCost,
    decimal StockValue);

public record StockValuationReportDto(
    DateTime AsOf,
    decimal TotalValue,
    int ItemCount,
    IReadOnlyList<StockValuationLineDto> Lines);

public record ExpenseReportLineDto(
    Guid ExpenseId,
    string Number,
    DateTime Date,
    string CategoryName,
    string PaymentAccountName,
    decimal Amount,
    string? Notes);

public record ExpenseReportDto(
    DateTime From,
    DateTime To,
    int ExpenseCount,
    decimal TotalAmount,
    IReadOnlyList<ExpenseReportLineDto> Lines,
    IReadOnlyList<ProfitLossCategoryBreakdownDto> ByCategory);

public interface IReportService
{
    Task<SalesReportDto> GetSalesReportAsync(DateTime from, DateTime to, CancellationToken ct = default);
    Task<PurchaseReportDto> GetPurchaseReportAsync(DateTime from, DateTime to, CancellationToken ct = default);
    Task<StockValuationReportDto> GetStockValuationReportAsync(CancellationToken ct = default);
    Task<ExpenseReportDto> GetExpenseReportAsync(DateTime from, DateTime to, CancellationToken ct = default);
}
