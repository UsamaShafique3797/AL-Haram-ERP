using AlHaram.Application.Common.Models;

namespace AlHaram.Application.Items;

public record ItemUnitDto(
    Guid UnitId,
    string UnitName,
    string UnitCode,
    decimal ConversionFactor,
    bool IsBaseUnit);

public record ItemDto(
    Guid Id,
    string Code,
    string Name,
    Guid CategoryId,
    string CategoryName,
    string? Brand,
    string? HsCode,
    Guid BaseUnitId,
    string BaseUnitCode,
    decimal DefaultPurchaseRate,
    decimal DefaultSaleRate,
    decimal ReorderLevel,
    decimal? Diameter,
    string? Grade,
    decimal? Length,
    decimal? WeightPerPiece,
    bool TrackInventory,
    bool IsActive,
    decimal StockOnHand,
    decimal StockValue,
    bool IsLowStock,
    IReadOnlyList<ItemUnitDto> Units);

public record SaveItemUnitRequest(
    Guid UnitId,
    decimal ConversionFactor);

public record SaveItemRequest(
    string Code,
    string Name,
    Guid CategoryId,
    string? Brand,
    string? HsCode,
    Guid BaseUnitId,
    decimal DefaultPurchaseRate,
    decimal DefaultSaleRate,
    decimal ReorderLevel,
    decimal? Diameter,
    string? Grade,
    decimal? Length,
    decimal? WeightPerPiece,
    bool TrackInventory,
    bool IsActive,
    IReadOnlyList<SaveItemUnitRequest> AdditionalUnits);

public interface IItemService
{
    Task<IReadOnlyList<ItemDto>> GetAllAsync(CancellationToken ct = default);
    Task<ItemDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<ItemDto>> CreateAsync(SaveItemRequest request, CancellationToken ct = default);
    Task<Result<ItemDto>> UpdateAsync(Guid id, SaveItemRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
