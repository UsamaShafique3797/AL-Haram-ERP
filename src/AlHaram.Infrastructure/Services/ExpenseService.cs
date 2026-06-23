using AlHaram.Application.Common.Models;
using AlHaram.Application.Finance;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class ExpenseService : IExpenseService
{
    private readonly AppDbContext _db;

    public ExpenseService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<ExpenseDto>> GetAllAsync(
        DateTime? from = null, DateTime? to = null, Guid? categoryId = null, CancellationToken ct = default)
    {
        var query = _db.Expenses
            .Include(e => e.ExpenseCategory)
            .Include(e => e.PaymentAccount)
            .AsQueryable();

        if (from is not null) query = query.Where(e => e.Date >= from.Value);
        if (to is not null) query = query.Where(e => e.Date <= to.Value);
        if (categoryId is not null) query = query.Where(e => e.ExpenseCategoryId == categoryId);

        var list = await query
            .OrderByDescending(e => e.Date)
            .ThenByDescending(e => e.CreatedAt)
            .ToListAsync(ct);

        return list.Select(ToDto).ToList();
    }

    public async Task<ExpenseDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var expense = await _db.Expenses
            .Include(e => e.ExpenseCategory)
            .Include(e => e.PaymentAccount)
            .FirstOrDefaultAsync(e => e.Id == id, ct);
        return expense is null ? null : ToDto(expense);
    }

    public async Task<Result<ExpenseDto>> CreateAsync(SaveExpenseRequest request, CancellationToken ct = default)
    {
        if (request.Amount <= 0) return Result<ExpenseDto>.Failure("Amount must be greater than zero.");
        if (!await _db.ExpenseCategories.AnyAsync(c => c.Id == request.ExpenseCategoryId, ct))
            return Result<ExpenseDto>.Failure("Expense category not found.");
        if (!await _db.PaymentAccounts.AnyAsync(p => p.Id == request.PaymentAccountId, ct))
            return Result<ExpenseDto>.Failure("Payment account not found.");

        var category = await _db.ExpenseCategories.FirstAsync(c => c.Id == request.ExpenseCategoryId, ct);

        var expense = new Expense
        {
            Number = await NextExpenseNumberAsync(ct),
            Date = request.Date,
            ExpenseCategoryId = request.ExpenseCategoryId,
            Amount = request.Amount,
            PaymentAccountId = request.PaymentAccountId,
            Notes = request.Notes,
            AttachmentPath = request.AttachmentPath
        };
        _db.Expenses.Add(expense);

        _db.CashBankTransactions.Add(new CashBankTransaction
        {
            PaymentAccountId = request.PaymentAccountId,
            Date = request.Date,
            Source = CashBankSource.Expense,
            Amount = -request.Amount,
            SourceDocumentId = expense.Id,
            Reference = expense.Number,
            Notes = category.Name
        });

        await _db.SaveChangesAsync(ct);

        var saved = await GetByIdAsync(expense.Id, ct);
        return Result<ExpenseDto>.Success(saved!);
    }

    public async Task<Result<ExpenseDto>> UpdateAsync(Guid id, SaveExpenseRequest request, CancellationToken ct = default)
    {
        if (request.Amount <= 0) return Result<ExpenseDto>.Failure("Amount must be greater than zero.");
        if (!await _db.ExpenseCategories.AnyAsync(c => c.Id == request.ExpenseCategoryId, ct))
            return Result<ExpenseDto>.Failure("Expense category not found.");
        if (!await _db.PaymentAccounts.AnyAsync(p => p.Id == request.PaymentAccountId, ct))
            return Result<ExpenseDto>.Failure("Payment account not found.");

        var expense = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id, ct);
        if (expense is null) return Result<ExpenseDto>.Failure("Expense not found.");

        var category = await _db.ExpenseCategories.FirstAsync(c => c.Id == request.ExpenseCategoryId, ct);
        var txn = await _db.CashBankTransactions
            .FirstOrDefaultAsync(t => t.SourceDocumentId == id && t.Source == CashBankSource.Expense, ct);

        expense.Date = request.Date;
        expense.ExpenseCategoryId = request.ExpenseCategoryId;
        expense.Amount = request.Amount;
        expense.PaymentAccountId = request.PaymentAccountId;
        expense.Notes = request.Notes;
        expense.AttachmentPath = request.AttachmentPath;

        if (txn is null)
        {
            _db.CashBankTransactions.Add(new CashBankTransaction
            {
                PaymentAccountId = request.PaymentAccountId,
                Date = request.Date,
                Source = CashBankSource.Expense,
                Amount = -request.Amount,
                SourceDocumentId = expense.Id,
                Reference = expense.Number,
                Notes = category.Name
            });
        }
        else
        {
            txn.PaymentAccountId = request.PaymentAccountId;
            txn.Date = request.Date;
            txn.Amount = -request.Amount;
            txn.Reference = expense.Number;
            txn.Notes = category.Name;
        }

        await _db.SaveChangesAsync(ct);
        return Result<ExpenseDto>.Success((await GetByIdAsync(id, ct))!);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var expense = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id, ct);
        if (expense is null) return false;

        var txn = await _db.CashBankTransactions
            .FirstOrDefaultAsync(t => t.SourceDocumentId == id && t.Source == CashBankSource.Expense, ct);
        if (txn is not null) _db.CashBankTransactions.Remove(txn);

        _db.Expenses.Remove(expense);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private async Task<string> NextExpenseNumberAsync(CancellationToken ct)
    {
        var count = await _db.Expenses.IgnoreQueryFilters().CountAsync(ct);
        return $"EXP-{count + 1:D5}";
    }

    private static ExpenseDto ToDto(Expense e) =>
        new(e.Id, e.Number, e.Date,
            e.ExpenseCategoryId, e.ExpenseCategory?.Name ?? string.Empty,
            e.Amount, e.PaymentAccountId, e.PaymentAccount?.Name ?? string.Empty,
            e.Notes, e.AttachmentPath);
}
