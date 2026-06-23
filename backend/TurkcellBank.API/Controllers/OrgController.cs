using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Org;
using TurkcellBank.Application.Features.Org.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>
/// Yönetici organizasyon görünümü (görünürlük zinciri + basit raporlar).
/// Şube/il müdürü ve direktör erişebilir; içerik role göre belirlenir.
/// </summary>
[ApiController]
[Route("api/org")]
[Authorize(Roles = "BranchManager,ProvincialManager,Director")]
public class OrgController : ControllerBase
{
    private readonly IOrgService _org;

    public OrgController(IOrgService org)
    {
        _org = org;
    }

    /// <summary>Ekibim + özet istatistikler. GET /api/org/team</summary>
    [HttpGet("team")]
    public async Task<IActionResult> Team()
    {
        var view = await _org.GetTeamAsync();
        return Ok(ApiResponse<OrgViewDto>.SuccessResponse(view));
    }
}
