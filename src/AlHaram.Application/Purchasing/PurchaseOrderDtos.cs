using AlHaram.Application.Common.Models;
using AlHaram.Domain.Enums;

namespace AlHaram.Application.Purchasing;

public record PurchaseOrderLineDto(
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
    decimal ReceivedQuantity,
    decimal PendingQuantity);

public record PurchaseOrderDto(
    Guid Id,
    string Number,
    DateTime Date,
    DateTime? ExpectedDate,
    Guid SupplierId,
    string SupplierName,
    Guid GodownId,
    string GodownName,
    PurchaseOrderStatus Status,
    decimal Subtotal,
    decimal Discount,
    decimal TaxRate,
    decimal TaxAmount,
    decimal Total,
    string? Notes,
    IReadOnlyList<PurchaseOrderLineDto> Lines);

public record SavePurchaseOrderLineRequest(
    Guid ItemId,
    Guid UnitId,
    decimal Quantity,
    decimal Rate,
    decimal Discount);

public record SavePurchaseOrderRequest(
    DateTime Date,
    DateTime? ExpectedDate,
    Guid SupplierId,
    Guid GodownId,
    decimal Discount,
    decimal TaxRate,
    string? Notes,
    IReadOnlyList<SavePurchaseOrderLineRequest> Lines);

public interface IPurchaseOrderService
{
    Task<IReadOnlyList<PurchaseOrderDto>> GetAllAsync(Guid? supplierId = null, CancellationToken ct = default);
    Task<PurchaseOrderDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<PurchaseOrderDto>> CreateAsync(SavePurchaseOrderRequest request, CancellationToken ct = default);
    Task<Result<PurchaseOrderDto>> UpdateStatusAsync(Guid id, PurchaseOrderStatus status, CancellationToken ct = default);
}

public record GrnLineDto(
    Guid Id,
    Guid ItemId,
    string ItemCode,
    string ItemName,
    Guid UnitId,
    string UnitCode,
    decimal Quantity,
    decimal ConversionFactor,
    decimal BaseQuantity,
    decimal UnitCost,
    decimal LineCost);

public record GrnDto(
    Guid Id,
    string Number,
    DateTime Date,
    Guid SupplierId,
    string SupplierName,
    Guid GodownId,
    string GodownName,
    Guid? PurchaseOrderId,
    string? PurchaseOrderNumber,
    GrnStatus Status,
    string? Notes,
    IReadOnlyList<GrnLineDto> Lines);

public record SaveGrnLineRequest(
    Guid ItemId,
    Guid UnitId,
    decimal Quantity,
    decimal UnitCost,
    Guid? PurchaseOrderLineId);

public record SaveGrnRequest(
    DateTime Date,
    Guid SupplierId,
    Guid GodownId,
    Guid? PurchaseOrderId,
    string? Notes,
    IReadOnlyList<SaveGrnLineRequest> Lines);

public interface IGrnService
{
    Task<IReadOnlyList<GrnDto>> GetAllAsync(Guid? supplierId = null, CancellationToken ct = default);
    Task<GrnDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<GrnDto>> CreateAsync(SaveGrnRequest request, CancellationToken ct = default);
}
