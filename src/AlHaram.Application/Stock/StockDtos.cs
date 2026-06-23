using AlHaram.Application.Common.Models;
using AlHaram.Domain.Enums;

namespace AlHaram.Application.Stock;

public record StockLevelDto(
    Guid ItemId,
    string ItemCode,
    string ItemName,
    string BaseUnitCode,
    Guid GodownId,
    string GodownName,
    decimal Quantity,
    decimal AverageCost,
    decimal StockValue,
    decimal ReorderLevel,
    bool IsLowStock);

public record StockMovementDto(
    Guid Id,
    DateTime Date,
    string Type,
    Guid ItemId,
    string ItemName,
    Guid GodownId,
    string GodownName,
    decimal Quantity,
    decimal UnitCost,
    decimal QuantityAfter,
    decimal AverageCostAfter,
    string? Reference,
    string? Notes);

public record OpeningStockRequest(
    Guid ItemId,
    Guid GodownId,
    decimal Quantity,
    decimal UnitCost,
    DateTime Date,
    string? Notes);

public record UpdateStockLevelRequest(
    Guid ItemId,
    Guid GodownId,
    decimal Quantity,
    decimal UnitCost,
    DateTime Date,
    string? Notes);

public record StockAdjustmentLineDto(
    Guid Id,
    Guid ItemId,
    string ItemCode,
    string ItemName,
    AdjustmentDirection Direction,
    decimal Quantity,
    decimal UnitCost,
    string? Notes);

public record StockAdjustmentDto(
    Guid Id,
    string Number,
    DateTime Date,
    Guid GodownId,
    string GodownName,
    string? Reason,
    string? Notes,
    IReadOnlyList<StockAdjustmentLineDto> Lines);

public record SaveStockAdjustmentLineRequest(
    Guid ItemId,
    AdjustmentDirection Direction,
    decimal Quantity,
    decimal UnitCost,
    string? Notes);

public record SaveStockAdjustmentRequest(
    DateTime Date,
    Guid GodownId,
    string? Reason,
    string? Notes,
    IReadOnlyList<SaveStockAdjustmentLineRequest> Lines);

public interface IStockService
{
    Task<IReadOnlyList<StockLevelDto>> GetLevelsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<StockMovementDto>> GetMovementsAsync(Guid itemId, Guid? godownId = null, CancellationToken ct = default);
    Task<Result<StockMovementDto>> PostOpeningStockAsync(OpeningStockRequest request, CancellationToken ct = default);
    Task<Result<StockLevelDto>> UpdateStockLevelAsync(UpdateStockLevelRequest request, CancellationToken ct = default);
    Task<Result> DeleteStockLevelAsync(Guid itemId, Guid godownId, CancellationToken ct = default);

    Task<IReadOnlyList<StockAdjustmentDto>> GetAdjustmentsAsync(CancellationToken ct = default);
    Task<StockAdjustmentDto?> GetAdjustmentByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<StockAdjustmentDto>> CreateAdjustmentAsync(SaveStockAdjustmentRequest request, CancellationToken ct = default);
}
