using AlHaram.Application.Common.Models;

namespace AlHaram.Application.Sales;

public record SalesReturnLineDto(
    Guid Id,
    Guid ItemId,
    string ItemCode,
    string ItemName,
    Guid UnitId,
    string UnitCode,
    decimal Quantity,
    decimal ConversionFactor,
    decimal BaseQuantity,
    decimal Rate,
    decimal LineTotal,
    decimal UnitCost,
    decimal LineCost);

public record SalesReturnDto(
    Guid Id,
    string Number,
    DateTime Date,
    Guid CustomerId,
    string CustomerName,
    Guid GodownId,
    string GodownName,
    Guid SalesInvoiceId,
    string SalesInvoiceNumber,
    decimal Subtotal,
    decimal TaxAmount,
    decimal Total,
    string? Reason,
    string? Notes,
    IReadOnlyList<SalesReturnLineDto> Lines);

public record SaveSalesReturnLineRequest(
    Guid SalesInvoiceLineId,
    decimal Quantity);

public record SaveSalesReturnRequest(
    DateTime Date,
    Guid SalesInvoiceId,
    string? Reason,
    string? Notes,
    IReadOnlyList<SaveSalesReturnLineRequest> Lines);

public interface ISalesReturnService
{
    Task<IReadOnlyList<SalesReturnDto>> GetAllAsync(CancellationToken ct = default);
    Task<SalesReturnDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<SalesReturnDto>> CreateAsync(SaveSalesReturnRequest request, CancellationToken ct = default);
}
