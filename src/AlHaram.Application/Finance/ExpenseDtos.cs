namespace AlHaram.Application.Finance;

public record ExpenseDto(
    Guid Id,
    string Number,
    DateTime Date,
    Guid ExpenseCategoryId,
    string ExpenseCategoryName,
    decimal Amount,
    Guid PaymentAccountId,
    string PaymentAccountName,
    string? Notes,
    string? AttachmentPath);

public record SaveExpenseRequest(
    DateTime Date,
    Guid ExpenseCategoryId,
    decimal Amount,
    Guid PaymentAccountId,
    string? Notes,
    string? AttachmentPath);

public interface IExpenseService
{
    Task<IReadOnlyList<ExpenseDto>> GetAllAsync(DateTime? from = null, DateTime? to = null, Guid? categoryId = null, CancellationToken ct = default);
    Task<ExpenseDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Common.Models.Result<ExpenseDto>> CreateAsync(SaveExpenseRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
