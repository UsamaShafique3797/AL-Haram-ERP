using AlHaram.Application.Common.Models;
using AlHaram.Domain.Enums;

namespace AlHaram.Application.Sales;

public record DeliveryChallanLineDto(
    Guid Id,
    Guid ItemId,
    string ItemCode,
    string ItemName,
    Guid UnitId,
    string UnitCode,
    decimal Quantity,
    decimal ConversionFactor,
    decimal BaseQuantity);

public record DeliveryChallanDto(
    Guid Id,
    string Number,
    DateTime Date,
    Guid CustomerId,
    string CustomerName,
    Guid GodownId,
    string GodownName,
    Guid? SalesInvoiceId,
    string? SalesInvoiceNumber,
    DeliveryChallanStatus Status,
    string? VehicleNo,
    string? DriverName,
    string? Notes,
    IReadOnlyList<DeliveryChallanLineDto> Lines);

public record SaveDeliveryChallanLineRequest(
    Guid ItemId,
    Guid UnitId,
    decimal Quantity);

public record SaveDeliveryChallanRequest(
    DateTime Date,
    Guid CustomerId,
    Guid GodownId,
    Guid? SalesInvoiceId,
    string? VehicleNo,
    string? DriverName,
    string? Notes,
    IReadOnlyList<SaveDeliveryChallanLineRequest> Lines);

public interface IDeliveryChallanService
{
    Task<IReadOnlyList<DeliveryChallanDto>> GetAllAsync(Guid? customerId = null, CancellationToken ct = default);
    Task<DeliveryChallanDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<DeliveryChallanDto>> CreateAsync(SaveDeliveryChallanRequest request, CancellationToken ct = default);
}

public record QuotationLineDto(
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
    decimal LineTotal);

public record QuotationDto(
    Guid Id,
    string Number,
    DateTime Date,
    DateTime? ValidUntil,
    Guid CustomerId,
    string CustomerName,
    QuotationStatus Status,
    decimal Subtotal,
    decimal Discount,
    decimal TaxRate,
    decimal TaxAmount,
    decimal Total,
    Guid? ConvertedSalesInvoiceId,
    string? ConvertedSalesInvoiceNumber,
    string? Notes,
    IReadOnlyList<QuotationLineDto> Lines);

public record SaveQuotationLineRequest(
    Guid ItemId,
    Guid UnitId,
    decimal Quantity,
    decimal Rate,
    decimal Discount);

public record SaveQuotationRequest(
    DateTime Date,
    DateTime? ValidUntil,
    Guid CustomerId,
    decimal Discount,
    decimal TaxRate,
    string? Notes,
    IReadOnlyList<SaveQuotationLineRequest> Lines);

public interface IQuotationService
{
    Task<IReadOnlyList<QuotationDto>> GetAllAsync(Guid? customerId = null, CancellationToken ct = default);
    Task<QuotationDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<QuotationDto>> CreateAsync(SaveQuotationRequest request, CancellationToken ct = default);
    Task<Result<QuotationDto>> UpdateAsync(Guid id, SaveQuotationRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<Result<SalesInvoiceDto>> ConvertToInvoiceAsync(Guid id, SaveSalesInvoiceRequest request, CancellationToken ct = default);
}

public record AgeingBucketDto(string Label, int DaysFrom, int? DaysTo, decimal Amount, int InvoiceCount);

public record ReceivableAgeingDto(
    Guid CustomerId,
    string CustomerName,
    string? Phone,
    decimal TotalOutstanding,
    IReadOnlyList<AgeingBucketDto> Buckets);

public record PayableAgeingDto(
    Guid SupplierId,
    string SupplierName,
    string? Phone,
    decimal TotalOutstanding,
    IReadOnlyList<AgeingBucketDto> Buckets);

public interface IAgeingService
{
    Task<IReadOnlyList<ReceivableAgeingDto>> GetReceivablesAgeingAsync(CancellationToken ct = default);
    Task<IReadOnlyList<PayableAgeingDto>> GetPayablesAgeingAsync(CancellationToken ct = default);
}
