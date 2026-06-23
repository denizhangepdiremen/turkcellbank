using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Audit;
using TurkcellBank.Application.Features.Audit.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>
/// Denetim kaydı görüntüleme. Admin (teknik) ve direktör erişebilir.
/// </summary>
[ApiController]
[Route("api/audit")]
[Authorize(Roles = "Admin,Director")]
public class AuditController : ControllerBase
{
    private readonly IAuditService _audit;

    public AuditController(IAuditService audit)
    {
        _audit = audit;
    }

    /// <summary>Son denetim kayıtları. GET /api/audit</summary>
    [HttpGet]
    public async Task<IActionResult> Recent()
    {
        var logs = await _audit.GetRecentAsync();
        return Ok(ApiResponse<List<AuditLogDto>>.SuccessResponse(logs));
    }
}
