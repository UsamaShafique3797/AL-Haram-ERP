using AlHaram.Application.Common.Models;
using AlHaram.Domain.Enums;

namespace AlHaram.Application.Purchasing;

public record PurchaseInvoiceLineDto(
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

public record PurchaseInvoiceDto(
    Guid Id,
    string Number,
    DateTime Date,
    Guid SupplierId,
    string SupplierName,
    Guid GodownId,
    string GodownName,
    PurchaseDocStatus Status,
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
    string? Notes,
    IReadOnlyList<PurchaseInvoiceLineDto> Lines);

public record SavePurchaseInvoiceLineRequest(
    Guid ItemId,
    Guid UnitId,
    decimal Quantity,
    decimal Rate,
    decimal Discount);

public record SavePurchaseInvoiceRequest(
    DateTime Date,
    Guid SupplierId,
    Guid GodownId,
    decimal Discount,
    decimal TaxRate,
    decimal PaidAmount,
    Guid? PaymentAccountId,
    string? Notes,
    IReadOnlyList<SavePurchaseInvoiceLineRequest> Lines);

public record OpenPurchaseInvoiceDto(
    Guid Id,
    string Number,
    DateTime Date,
    decimal Total,
    decimal AmountAllocated,
    decimal Balance);

public interface IPurchaseInvoiceService
{
    Task<IReadOnlyList<PurchaseInvoiceDto>> GetAllAsync(Guid? supplierId = null, CancellationToken ct = default);
    Task<PurchaseInvoiceDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<PurchaseInvoiceDto>> CreateAsync(SavePurchaseInvoiceRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<OpenPurchaseInvoiceDto>> GetOpenInvoicesAsync(Guid supplierId, CancellationToken ct = default);
}
