using AlHaram.Application.Common;
using AlHaram.Application.Common.Models;
using AlHaram.Application.Finance;
using AlHaram.Domain.Entities;
using AlHaram.Domain.Enums;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Services;

public class ExpenseService : IExpenseService
{
    private readonly AppDbContext _db;
    private readonly IBranchScope _branch;

    public ExpenseService(AppDbContext db, IBranchScope branch)
    {
        _db = db;
        _branch = branch;
    }

    public async Task<IReadOnlyList<ExpenseDto>> GetAllAsync(
        DateTime? from = null, DateTime? to = null, Guid? categoryId = null, CancellationToken ct = default)
    {
        var query = _db.Expenses
            .ForBranch(_branch)
            .Include(e => e.ExpenseCategory)
            .Include(e => e.PaymentAccount)
            .Include(e => e.Godown)
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
            .Include(e => e.Godown)
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

        var godownId = await ResolveGodownAsync(request.GodownId, ct);
        if (godownId is null)
            return Result<ExpenseDto>.Failure("Please select a branch for this expense.");
        if (!_branch.CanUseGodown(godownId.Value))
            return Result<ExpenseDto>.Failure("You cannot record an expense for that branch.");

        var expense = new Expense
        {
            Number = await NextExpenseNumberAsync(ct),
            Date = request.Date,
            ExpenseCategoryId = request.ExpenseCategoryId,
            Amount = request.Amount,
            GodownId = godownId,
            PaymentAccountId = request.PaymentAccountId,
            Notes = request.Notes,
            AttachmentPath = request.AttachmentPath
        };
        _db.Expenses.Add(expense);

        _db.CashBankTransactions.Add(new CashBankTransaction
        {
            PaymentAccountId = request.PaymentAccountId,
            GodownId = godownId,
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

        var godownId = await ResolveGodownAsync(request.GodownId ?? expense.GodownId, ct);
        if (godownId is null)
            return Result<ExpenseDto>.Failure("Please select a branch for this expense.");
        if (!_branch.CanUseGodown(godownId.Value))
            return Result<ExpenseDto>.Failure("You cannot record an expense for that branch.");

        expense.Date = request.Date;
        expense.ExpenseCategoryId = request.ExpenseCategoryId;
        expense.Amount = request.Amount;
        expense.GodownId = godownId;
        expense.PaymentAccountId = request.PaymentAccountId;
        expense.Notes = request.Notes;
        expense.AttachmentPath = request.AttachmentPath;

        if (txn is null)
        {
            _db.CashBankTransactions.Add(new CashBankTransaction
            {
                PaymentAccountId = request.PaymentAccountId,
                GodownId = godownId,
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
            txn.GodownId = godownId;
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

    /// <summary>
    /// Branch-locked users are forced to their own godown. Admins use the branch they are
    /// currently filtered to, else the branch chosen on the form, else the default godown.
    /// </summary>
    private async Task<Guid?> ResolveGodownAsync(Guid? requested, CancellationToken ct)
    {
        if (_branch.EffectiveGodownId is Guid eff) return eff;
        if (requested is Guid g) return g;
        return await _db.Godowns.Where(x => x.IsDefault).Select(x => (Guid?)x.Id).FirstOrDefaultAsync(ct)
            ?? await _db.Godowns.OrderBy(x => x.Name).Select(x => (Guid?)x.Id).FirstOrDefaultAsync(ct);
    }

    private static ExpenseDto ToDto(Expense e) =>
        new(e.Id, e.Number, e.Date,
            e.ExpenseCategoryId, e.ExpenseCategory?.Name ?? string.Empty,
            e.Amount, e.PaymentAccountId, e.PaymentAccount?.Name ?? string.Empty,
            e.Notes, e.AttachmentPath,
            e.GodownId, e.Godown?.Name);
}
