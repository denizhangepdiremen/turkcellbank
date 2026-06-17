using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Admin;
using TurkcellBank.Application.Features.Auth.Dtos;
using TurkcellBank.Application.Features.Loans;
using TurkcellBank.Application.Features.Loans.Dtos;

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
    private readonly ILoanService _loanService;

    public AdminController(IAdminService adminService, ILoanService loanService)
    {
        _adminService = adminService;
        _loanService = loanService;
    }

    /// <summary>Tüm kullanıcıları listele. GET /api/admin/users</summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _adminService.GetUsersAsync();
        return Ok(ApiResponse<List<UserDto>>.SuccessResponse(users));
    }

    /// <summary>Tüm kredi başvuruları (başvuranla). GET /api/admin/loans</summary>
    [HttpGet("loans")]
    public async Task<IActionResult> GetLoans()
    {
        var loans = await _loanService.GetAllLoansAsync();
        return Ok(ApiResponse<List<AdminLoanDto>>.SuccessResponse(loans));
    }

    /// <summary>Krediyi onayla. POST /api/admin/loans/{id}/approve</summary>
    [HttpPost("loans/{id:guid}/approve")]
    public async Task<IActionResult> ApproveLoan(Guid id)
    {
        var loan = await _loanService.ApproveAsync(id);
        return Ok(ApiResponse<LoanDto>.SuccessResponse(loan, "Başvuru onaylandı."));
    }

    /// <summary>Krediyi reddet. POST /api/admin/loans/{id}/reject</summary>
    [HttpPost("loans/{id:guid}/reject")]
    public async Task<IActionResult> RejectLoan(Guid id)
    {
        var loan = await _loanService.RejectAsync(id);
        return Ok(ApiResponse<LoanDto>.SuccessResponse(loan, "Başvuru reddedildi."));
    }
}
