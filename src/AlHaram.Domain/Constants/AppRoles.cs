namespace AlHaram.Domain.Constants;

/// <summary>
/// Built-in role names used for authorization across the application.
/// </summary>
public static class AppRoles
{
    /// <summary>Full company-wide access across every branch (godown).</summary>
    public const string Administrator = "Administrator";
    /// <summary>Branch-level access — limited to the godown the user is assigned to.</summary>
    public const string Manager = "Manager";
    public const string Salesman = "Salesman";
    public const string StoreKeeper = "StoreKeeper";
    public const string Accountant = "Accountant";

    public static readonly string[] All =
    {
        Administrator, Manager, Salesman, StoreKeeper, Accountant
    };
}
