using AlHaram.Application.Common.Models;
using AlHaram.Domain.Enums;

namespace AlHaram.Application.Purchasing;

public record PaymentAllocationDto(
    Guid Id,
    Guid PurchaseInvoiceId,
    string PurchaseInvoiceNumber,
    decimal Amount);

public record SupplierPaymentDto(
    Guid Id,
    string Number,
    DateTime Date,
    Guid SupplierId,
    string SupplierName,
    Guid PaymentAccountId,
    string PaymentAccountName,
    PaymentMode Mode,
    decimal Amount,
    decimal AmountAllocated,
    decimal Unallocated,
    string? Reference,
    string? Notes,
    IReadOnlyList<PaymentAllocationDto> Allocations,
    Guid? GodownId = null,
    string? GodownName = null);

public record SavePaymentAllocationRequest(
    Guid PurchaseInvoiceId,
    decimal Amount);

public record SaveSupplierPaymentRequest(
    DateTime Date,
    Guid SupplierId,
    Guid PaymentAccountId,
    PaymentMode Mode,
    decimal Amount,
    string? Reference,
    string? Notes,
    IReadOnlyList<SavePaymentAllocationRequest> Allocations,
    Guid? GodownId = null);

public interface ISupplierPaymentService
{
    Task<IReadOnlyList<SupplierPaymentDto>> GetAllAsync(Guid? supplierId = null, CancellationToken ct = default);
    Task<SupplierPaymentDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<SupplierPaymentDto>> CreateAsync(SaveSupplierPaymentRequest request, CancellationToken ct = default);
}
