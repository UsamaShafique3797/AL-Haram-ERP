using AlHaram.Application.Common;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Http;

namespace AlHaram.Infrastructure.Auth;

public class BranchScope : IBranchScope
{
    public const string GodownClaim = "godown_id";

    private readonly IHttpContextAccessor _http;

    public BranchScope(IHttpContextAccessor http) => _http = http;

    public Guid? UserGodownId => ParseClaimGodown();

    /// <summary>
    /// Administrators manage the whole company across every branch.
    /// All other roles (including Manager) are locked to their assigned godown.
    /// </summary>
    private bool IsElevated =>
        _http.HttpContext?.User?.IsInRole(AppRoles.Administrator) == true;

    /// <summary>A user is locked to one branch only when assigned a godown AND not elevated.</summary>
    private bool IsBranchLocked => UserGodownId is not null && !IsElevated;

    public bool CanAccessAllBranches => !IsBranchLocked;

    public Guid? EffectiveGodownId
    {
        get
        {
            // Operational (branch-locked) users always see only their godown.
            if (IsBranchLocked)
                return UserGodownId;

            // Elevated/company-wide users may optionally filter by a branch.
            var ctx = _http.HttpContext;
            if (ctx is null) return null;

            if (ctx.Request.Query.TryGetValue("godownId", out var raw)
                && Guid.TryParse(raw.ToString(), out var selected))
                return selected;

            return null;
        }
    }

    public bool CanUseGodown(Guid godownId) =>
        !IsBranchLocked || UserGodownId == godownId;

    private Guid? ParseClaimGodown()
    {
        var value = _http.HttpContext?.User?.FindFirst(GodownClaim)?.Value;
        return Guid.TryParse(value, out var id) ? id : null;
    }
}
