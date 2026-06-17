using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Admin;
using TurkcellBank.Application.Features.Auth.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>
/// Admin işlemleri. [Authorize(Roles = "Admin")] = sadece rolü Admin olan
/// (token'ında Admin rolü taşıyan) kullanıcılar erişebilir. Customer -> 403.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    /// <summary>Tüm kullanıcıları listele. GET /api/admin/users</summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _adminService.GetUsersAsync();
        return Ok(ApiResponse<List<UserDto>>.SuccessResponse(users));
    }
}
