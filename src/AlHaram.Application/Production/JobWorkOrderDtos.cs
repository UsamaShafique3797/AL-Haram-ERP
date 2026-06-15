using AlHaram.Application.Common.Models;
using AlHaram.Domain.Enums;

namespace AlHaram.Application.Production;

public record JobWorkOrderDto(
    Guid Id,
    string Number,
    DateTime Date,
    Guid CustomerId,
    string CustomerName,
    string Description,
    decimal LaborCharge,
    JobWorkOrderStatus Status,
    string? Notes);

public record SaveJobWorkOrderRequest(
    DateTime Date,
    Guid CustomerId,
    string Description,
    decimal LaborCharge,
    JobWorkOrderStatus Status,
    string? Notes);

public interface IJobWorkOrderService
{
    Task<IReadOnlyList<JobWorkOrderDto>> GetAllAsync(CancellationToken ct = default);
    Task<JobWorkOrderDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<JobWorkOrderDto>> CreateAsync(SaveJobWorkOrderRequest request, CancellationToken ct = default);
    Task<Result<JobWorkOrderDto>> UpdateAsync(Guid id, SaveJobWorkOrderRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
