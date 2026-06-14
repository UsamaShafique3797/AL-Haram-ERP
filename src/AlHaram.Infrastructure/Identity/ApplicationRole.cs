using Microsoft.AspNetCore.Identity;

namespace AlHaram.Infrastructure.Identity;

/// <summary>
/// Application role (Owner, Manager, Salesman, StoreKeeper, Accountant).
/// </summary>
public class ApplicationRole : IdentityRole<Guid>
{
    public ApplicationRole() { }

    public ApplicationRole(string roleName) : base(roleName) { }

    public string? Description { get; set; }
}
