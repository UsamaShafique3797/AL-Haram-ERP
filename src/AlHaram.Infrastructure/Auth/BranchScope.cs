using AlHaram.Application.Common;
using Microsoft.AspNetCore.Http;

namespace AlHaram.Infrastructure.Auth;

public class BranchScope : IBranchScope
{
    public const string GodownClaim = "godown_id";

    private readonly IHttpContextAccessor _http;

    public BranchScope(IHttpContextAccessor http) => _http = http;

    public Guid? UserGodownId => ParseClaimGodown();

    public bool CanAccessAllBranches => UserGodownId is null;

    public Guid? EffectiveGodownId
    {
        get
        {
            if (UserGodownId is Guid assigned)
                return assigned;

            var ctx = _http.HttpContext;
            if (ctx is null) return null;

            if (ctx.Request.Query.TryGetValue("godownId", out var raw)
                && Guid.TryParse(raw.ToString(), out var selected))
                return selected;

            return null;
        }
    }

    public bool CanUseGodown(Guid godownId) =>
        UserGodownId is null || UserGodownId == godownId;

    private Guid? ParseClaimGodown()
    {
        var value = _http.HttpContext?.User?.FindFirst(GodownClaim)?.Value;
        return Guid.TryParse(value, out var id) ? id : null;
    }
}
