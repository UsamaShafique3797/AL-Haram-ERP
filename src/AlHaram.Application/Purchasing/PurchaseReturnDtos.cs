using AlHaram.Application.Common.Models;

namespace AlHaram.Application.Purchasing;

public record PurchaseReturnLineDto(
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

public record PurchaseReturnDto(
    Guid Id,
    string Number,
    DateTime Date,
    Guid SupplierId,
    string SupplierName,
    Guid GodownId,
    string GodownName,
    Guid PurchaseInvoiceId,
    string PurchaseInvoiceNumber,
    decimal Subtotal,
    decimal TaxAmount,
    decimal Total,
    string? Reason,
    string? Notes,
    IReadOnlyList<PurchaseReturnLineDto> Lines);

public record SavePurchaseReturnLineRequest(
    Guid PurchaseInvoiceLineId,
    decimal Quantity);

public record SavePurchaseReturnRequest(
    DateTime Date,
    Guid PurchaseInvoiceId,
    string? Reason,
    string? Notes,
    IReadOnlyList<SavePurchaseReturnLineRequest> Lines);

public interface IPurchaseReturnService
{
    Task<IReadOnlyList<PurchaseReturnDto>> GetAllAsync(CancellationToken ct = default);
    Task<PurchaseReturnDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<PurchaseReturnDto>> CreateAsync(SavePurchaseReturnRequest request, CancellationToken ct = default);
}
