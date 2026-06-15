using AlHaram.Application.Common.Models;

namespace AlHaram.Application.Production;

public record BomComponentDto(
    Guid Id,
    Guid RawItemId,
    string RawItemCode,
    string RawItemName,
    decimal QuantityPerUnit,
    string? Notes);

public record BillOfMaterialsDto(
    Guid Id,
    Guid FinishedItemId,
    string FinishedItemCode,
    string FinishedItemName,
    string? Name,
    string? Notes,
    bool IsActive,
    IReadOnlyList<BomComponentDto> Components);

public record SaveBomComponentRequest(
    Guid RawItemId,
    decimal QuantityPerUnit,
    string? Notes);

public record SaveBillOfMaterialsRequest(
    Guid FinishedItemId,
    string? Name,
    string? Notes,
    bool IsActive,
    IReadOnlyList<SaveBomComponentRequest> Components);

public interface IBomService
{
    Task<IReadOnlyList<BillOfMaterialsDto>> GetAllAsync(CancellationToken ct = default);
    Task<BillOfMaterialsDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<BillOfMaterialsDto?> GetByFinishedItemIdAsync(Guid finishedItemId, CancellationToken ct = default);
    Task<Result<BillOfMaterialsDto>> CreateAsync(SaveBillOfMaterialsRequest request, CancellationToken ct = default);
    Task<Result<BillOfMaterialsDto>> UpdateAsync(Guid id, SaveBillOfMaterialsRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
