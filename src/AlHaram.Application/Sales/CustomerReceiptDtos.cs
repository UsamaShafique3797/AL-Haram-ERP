using AlHaram.Application.Common.Models;
using AlHaram.Domain.Enums;

namespace AlHaram.Application.Sales;

public record ReceiptAllocationDto(
    Guid Id,
    Guid SalesInvoiceId,
    string SalesInvoiceNumber,
    decimal Amount);

public record CustomerReceiptDto(
    Guid Id,
    string Number,
    DateTime Date,
    Guid CustomerId,
    string CustomerName,
    Guid PaymentAccountId,
    string PaymentAccountName,
    PaymentMode Mode,
    decimal Amount,
    decimal AmountAllocated,
    decimal Unallocated,
    string? Reference,
    string? Notes,
    IReadOnlyList<ReceiptAllocationDto> Allocations,
    Guid? GodownId = null,
    string? GodownName = null);

public record SaveReceiptAllocationRequest(
    Guid SalesInvoiceId,
    decimal Amount);

public record SaveCustomerReceiptRequest(
    DateTime Date,
    Guid CustomerId,
    Guid PaymentAccountId,
    PaymentMode Mode,
    decimal Amount,
    string? Reference,
    string? Notes,
    IReadOnlyList<SaveReceiptAllocationRequest> Allocations,
    Guid? GodownId = null);

public interface ICustomerReceiptService
{
    Task<IReadOnlyList<CustomerReceiptDto>> GetAllAsync(Guid? customerId = null, CancellationToken ct = default);
    Task<CustomerReceiptDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<CustomerReceiptDto>> CreateAsync(SaveCustomerReceiptRequest request, CancellationToken ct = default);
}
