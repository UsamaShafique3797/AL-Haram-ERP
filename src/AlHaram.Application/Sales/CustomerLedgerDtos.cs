namespace AlHaram.Application.Sales;

/// <summary>One row in a customer's running statement (debit + / credit −).</summary>
public record CustomerLedgerEntryDto(
    DateTime Date,
    string DocumentType,
    string DocumentNumber,
    Guid? DocumentId,
    string? Reference,
    decimal Debit,
    decimal Credit,
    decimal Balance);

public record CustomerLedgerDto(
    Guid CustomerId,
    string CustomerName,
    decimal OpeningBalance,
    DateTime? OpeningBalanceAsOf,
    decimal TotalDebit,
    decimal TotalCredit,
    decimal ClosingBalance,
    IReadOnlyList<CustomerLedgerEntryDto> Entries);

/// <summary>Summary used for the receivables list (one row per customer).</summary>
public record ReceivableDto(
    Guid CustomerId,
    string CustomerName,
    string? Phone,
    decimal OpeningBalance,
    decimal Invoiced,
    decimal Returned,
    decimal Received,
    decimal Outstanding);

public interface ICustomerLedgerService
{
    Task<CustomerLedgerDto> GetLedgerAsync(Guid customerId, CancellationToken ct = default);
    Task<IReadOnlyList<ReceivableDto>> GetReceivablesAsync(CancellationToken ct = default);
}
