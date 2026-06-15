using AlHaram.Domain.Common;

namespace AlHaram.Domain.Entities;

/// <summary>
/// Expense grouping (rent, salary, fuel, labor…).
/// </summary>
public class ExpenseCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
}
