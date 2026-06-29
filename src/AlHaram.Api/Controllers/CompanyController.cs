using AlHaram.Application.Companies;
using AlHaram.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlHaram.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CompanyController : ControllerBase
{
    private readonly ICompanyService _company;

    public CompanyController(ICompanyService company) => _company = company;

    [HttpGet("branding")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBranding(CancellationToken ct)
        => Ok(await _company.GetBrandingAsync(ct));

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
        => Ok(await _company.GetAsync(ct));

    [HttpPut]
    [Authorize(Roles = $"{AppRoles.Administrator},{AppRoles.Manager}")]
    public async Task<IActionResult> Update([FromBody] UpdateCompanyRequest request, CancellationToken ct)
        => Ok(await _company.UpdateAsync(request, ct));
}
