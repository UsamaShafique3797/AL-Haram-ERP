namespace AlHaram.Application.Common;

/// <summary>
/// Resolves which godown (branch) the current request operates on.
/// Branch users are locked to their assigned godown; admins may filter via query string.
/// </summary>
public interface IBranchScope
{
    /// <summary>Godown assigned to the logged-in user, or null for company-wide access.</summary>
    Guid? UserGodownId { get; }

    /// <summary>Godown to filter by (user assignment or admin-selected branch).</summary>
    Guid? EffectiveGodownId { get; }

    /// <summary>True when the user may view all branches and optionally pick one.</summary>
    bool CanAccessAllBranches { get; }

    /// <summary>Returns false when a branch user tries to use a different godown.</summary>
    bool CanUseGodown(Guid godownId);
}
