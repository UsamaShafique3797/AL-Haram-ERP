using AlHaram.Application.Common.Models;
using AlHaram.Domain.Enums;

namespace AlHaram.Application.Production;

public record ProductionOrderLineDto(
    Guid Id,
    ProductionLineType LineType,
    Guid ItemId,
    string ItemCode,
    string ItemName,
    decimal Quantity,
    decimal UnitCost,
    decimal LineCost);

public record ProductionOrderDto(
    Guid Id,
    string Number,
    DateTime Date,
    Guid GodownId,
    string GodownName,
    Guid BillOfMaterialsId,
    Guid FinishedItemId,
    string FinishedItemCode,
    string FinishedItemName,
    decimal Quantity,
    decimal LaborOverhead,
    ProductionOrderStatus Status,
    decimal RawMaterialCost,
    decimal FinishedUnitCost,
    decimal TotalCost,
    Guid? ScrapItemId,
    string? ScrapItemCode,
    string? ScrapItemName,
    decimal ScrapQuantity,
    string? Notes,
    IReadOnlyList<ProductionOrderLineDto> Lines);

public record SaveProductionOrderRequest(
    DateTime Date,
    Guid GodownId,
    Guid BillOfMaterialsId,
    decimal Quantity,
    decimal LaborOverhead,
    Guid? ScrapItemId,
    decimal ScrapQuantity,
    string? Notes);

public interface IProductionOrderService
{
    Task<IReadOnlyList<ProductionOrderDto>> GetAllAsync(CancellationToken ct = default);
    Task<ProductionOrderDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<ProductionOrderDto>> CreateAsync(SaveProductionOrderRequest request, CancellationToken ct = default);
    Task<Result<ProductionOrderDto>> CompleteAsync(Guid id, CancellationToken ct = default);
    Task<Result<ProductionOrderDto>> CancelAsync(Guid id, CancellationToken ct = default);
}
