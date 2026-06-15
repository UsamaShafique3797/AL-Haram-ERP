namespace AlHaram.Application.Purchasing;

public record SupplierLedgerEntryDto(
    DateTime Date,
    string DocumentType,
    string DocumentNumber,
    Guid? DocumentId,
    string? Reference,
    decimal Debit,
    decimal Credit,
    decimal Balance);

public record SupplierLedgerDto(
    Guid SupplierId,
    string SupplierName,
    decimal OpeningBalance,
    DateTime? OpeningBalanceAsOf,
    decimal TotalDebit,
    decimal TotalCredit,
    decimal ClosingBalance,
    IReadOnlyList<SupplierLedgerEntryDto> Entries);

public record PayableDto(
    Guid SupplierId,
    string SupplierName,
    string? Phone,
    decimal OpeningBalance,
    decimal Invoiced,
    decimal Returned,
    decimal Paid,
    decimal Outstanding);

public interface ISupplierLedgerService
{
    Task<SupplierLedgerDto> GetLedgerAsync(Guid supplierId, CancellationToken ct = default);
    Task<IReadOnlyList<PayableDto>> GetPayablesAsync(CancellationToken ct = default);
}
