using AlHaram.Application.Common.Models;
using AlHaram.Domain.Enums;

namespace AlHaram.Application.Sales;

public record SalesInvoiceLineDto(
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
    decimal Discount,
    decimal LineTotal,
    decimal UnitCost,
    decimal LineCost);

public record SalesInvoiceDto(
    Guid Id,
    string Number,
    DateTime Date,
    Guid CustomerId,
    string CustomerName,
    Guid GodownId,
    string GodownName,
    SalesDocStatus Status,
    decimal Subtotal,
    decimal Discount,
    decimal TaxRate,
    decimal TaxAmount,
    decimal Total,
    decimal PaidAmount,
    decimal AmountAllocated,
    decimal Balance,
    Guid? PaymentAccountId,
    string? PaymentAccountName,
    decimal CostOfGoodsSold,
    string? Notes,
    IReadOnlyList<SalesInvoiceLineDto> Lines);

public record SaveSalesInvoiceLineRequest(
    Guid ItemId,
    Guid UnitId,
    decimal Quantity,
    decimal Rate,
    decimal Discount);

public record SaveSalesInvoiceRequest(
    DateTime Date,
    Guid CustomerId,
    Guid GodownId,
    decimal Discount,
    decimal TaxRate,
    decimal PaidAmount,
    Guid? PaymentAccountId,
    string? Notes,
    IReadOnlyList<SaveSalesInvoiceLineRequest> Lines);

public record OpenInvoiceDto(
    Guid Id,
    string Number,
    DateTime Date,
    decimal Total,
    decimal AmountAllocated,
    decimal Balance);

public interface ISalesInvoiceService
{
    Task<IReadOnlyList<SalesInvoiceDto>> GetAllAsync(Guid? customerId = null, CancellationToken ct = default);
    Task<SalesInvoiceDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<SalesInvoiceDto>> CreateAsync(SaveSalesInvoiceRequest request, CancellationToken ct = default);

    /// <summary>Open invoices (balance &gt; 0) for a customer — used by the receipt allocator.</summary>
    Task<IReadOnlyList<OpenInvoiceDto>> GetOpenInvoicesAsync(Guid customerId, CancellationToken ct = default);
}
