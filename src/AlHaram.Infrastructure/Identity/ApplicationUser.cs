using Microsoft.AspNetCore.Identity;

namespace AlHaram.Infrastructure.Identity;

/// <summary>
/// Application user. Extends ASP.NET Core Identity with display info and audit flags.
/// </summary>
public class ApplicationUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
}
