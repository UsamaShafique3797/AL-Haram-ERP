using AlHaram.Application.Common.Models;
using AlHaram.Application.Production;
using AlHaram.Domain.Entities;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class JobWorkOrderService : IJobWorkOrderService
{
    private readonly AppDbContext _db;

    public JobWorkOrderService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<JobWorkOrderDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.JobWorkOrders
            .Include(j => j.Customer)
            .OrderByDescending(j => j.Date)
            .ThenByDescending(j => j.CreatedAt)
            .Select(j => ToDto(j))
            .ToListAsync(ct);
    }

    public async Task<JobWorkOrderDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var order = await _db.JobWorkOrders
            .Include(j => j.Customer)
            .FirstOrDefaultAsync(j => j.Id == id, ct);
        return order is null ? null : ToDto(order);
    }

    public async Task<Result<JobWorkOrderDto>> CreateAsync(SaveJobWorkOrderRequest request, CancellationToken ct = default)
    {
        var validation = await ValidateAsync(request, ct);
        if (!validation.Succeeded) return Result<JobWorkOrderDto>.Failure(validation.Errors);

        var order = new JobWorkOrder
        {
            Number = await NextJobWorkNumberAsync(ct),
            Date = request.Date,
            CustomerId = request.CustomerId,
            Description = request.Description.Trim(),
            LaborCharge = request.LaborCharge,
            Status = request.Status,
            Notes = request.Notes
        };
        _db.JobWorkOrders.Add(order);
        await _db.SaveChangesAsync(ct);
        return Result<JobWorkOrderDto>.Success((await GetByIdAsync(order.Id, ct))!);
    }

    public async Task<Result<JobWorkOrderDto>> UpdateAsync(Guid id, SaveJobWorkOrderRequest request, CancellationToken ct = default)
    {
        var order = await _db.JobWorkOrders.FirstOrDefaultAsync(j => j.Id == id, ct);
        if (order is null) return Result<JobWorkOrderDto>.Failure("Job work order not found.");

        var validation = await ValidateAsync(request, ct);
        if (!validation.Succeeded) return Result<JobWorkOrderDto>.Failure(validation.Errors);

        order.Date = request.Date;
        order.CustomerId = request.CustomerId;
        order.Description = request.Description.Trim();
        order.LaborCharge = request.LaborCharge;
        order.Status = request.Status;
        order.Notes = request.Notes;

        await _db.SaveChangesAsync(ct);
        return Result<JobWorkOrderDto>.Success((await GetByIdAsync(id, ct))!);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var order = await _db.JobWorkOrders.FirstOrDefaultAsync(j => j.Id == id, ct);
        if (order is null) return false;

        _db.JobWorkOrders.Remove(order);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private async Task<Result<bool>> ValidateAsync(SaveJobWorkOrderRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Description))
            return Result<bool>.Failure("Description is required.");
        if (request.LaborCharge < 0)
            return Result<bool>.Failure("Labor charge cannot be negative.");
        if (!await _db.Customers.AnyAsync(c => c.Id == request.CustomerId, ct))
            return Result<bool>.Failure("Customer not found.");

        return Result<bool>.Success(true);
    }

    private async Task<string> NextJobWorkNumberAsync(CancellationToken ct)
    {
        var count = await _db.JobWorkOrders.IgnoreQueryFilters().CountAsync(ct);
        return $"JW-{count + 1:D5}";
    }

    private static JobWorkOrderDto ToDto(JobWorkOrder j) =>
        new(j.Id, j.Number, j.Date, j.CustomerId, j.Customer?.Name ?? string.Empty,
            j.Description, j.LaborCharge, j.Status, j.Notes);
}
