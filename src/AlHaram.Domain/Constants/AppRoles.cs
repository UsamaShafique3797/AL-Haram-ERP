namespace AlHaram.Domain.Constants;

/// <summary>
/// Built-in role names used for authorization across the application.
/// </summary>
public static class AppRoles
{
    public const string Owner = "Owner";
    public const string Manager = "Manager";
    public const string Salesman = "Salesman";
    public const string StoreKeeper = "StoreKeeper";
    public const string Accountant = "Accountant";

    public static readonly string[] All =
    {
        Owner, Manager, Salesman, StoreKeeper, Accountant
    };
}
