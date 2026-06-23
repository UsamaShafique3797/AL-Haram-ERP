using AlHaram.Application.Common.Models;
using AlHaram.Domain.Enums;

namespace AlHaram.Application.Stock;

public record StockTransferLineDto(
    Guid Id,
    Guid ItemId,
    string ItemCode,
    string ItemName,
    decimal Quantity,
    decimal UnitCost);

public record StockTransferDto(
    Guid Id,
    string Number,
    DateTime Date,
    Guid FromGodownId,
    string FromGodownName,
    Guid ToGodownId,
    string ToGodownName,
    StockTransferStatus Status,
    string? Notes,
    IReadOnlyList<StockTransferLineDto> Lines);

public record SaveStockTransferLineRequest(Guid ItemId, decimal Quantity);

public record SaveStockTransferRequest(
    DateTime Date,
    Guid FromGodownId,
    Guid ToGodownId,
    string? Notes,
    IReadOnlyList<SaveStockTransferLineRequest> Lines);

public interface IStockTransferService
{
    Task<IReadOnlyList<StockTransferDto>> GetAllAsync(CancellationToken ct = default);
    Task<StockTransferDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<StockTransferDto>> CreateAsync(SaveStockTransferRequest request, CancellationToken ct = default);
    Task<Result<StockTransferDto>> UpdateAsync(Guid id, SaveStockTransferRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<Result<StockTransferDto>> CompleteAsync(Guid id, CancellationToken ct = default);
}
