using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Loans;
using TurkcellBank.Application.Features.Loans.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>
/// Yetkili kredi onay işlemleri. Sadece banka organizasyon hiyerarşisindeki
/// yöneticiler erişebilir (şube/il müdürü, direktör). Admin (teknik) erişemez.
/// Onay yetkisi tutar bandına göredir; servis, isteği yapan rolün ilgili krediyi
/// onaylayıp onaylayamayacağını denetler.
/// </summary>
[ApiController]
[Route("api/approvals")]
[Authorize(Roles = "BranchManager,ProvincialManager,Director")]
public class ApprovalsController : ControllerBase
{
    private readonly ILoanService _loanService;

    public ApprovalsController(ILoanService loanService)
    {
        _loanService = loanService;
    }

    /// <summary>Onay bekleyen krediler (görünüm + CanApprove). GET /api/approvals/loans</summary>
    [HttpGet("loans")]
    public async Task<IActionResult> PendingLoans()
    {
        var loans = await _loanService.GetPendingApprovalsAsync();
        return Ok(ApiResponse<List<PendingLoanDto>>.SuccessResponse(loans));
    }

    /// <summary>Krediyi onayla. POST /api/approvals/loans/{id}/approve</summary>
    [HttpPost("loans/{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ApprovalDecisionRequest? request)
    {
        var loan = await _loanService.ApproveAsync(id, request?.Note);
        return Ok(ApiResponse<LoanDto>.SuccessResponse(loan, "Başvuru onaylandı."));
    }

    /// <summary>Krediyi reddet. POST /api/approvals/loans/{id}/reject</summary>
    [HttpPost("loans/{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] ApprovalDecisionRequest? request)
    {
        var loan = await _loanService.RejectAsync(id, request?.Note);
        return Ok(ApiResponse<LoanDto>.SuccessResponse(loan, "Başvuru reddedildi."));
    }
}
