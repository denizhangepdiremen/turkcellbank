using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Loans;
using TurkcellBank.Application.Features.Loans.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>Müşteri kredi işlemleri. Tümü [Authorize].</summary>
[ApiController]
[Route("api/loans")]
[Authorize]
public class LoansController : ControllerBase
{
    private readonly ILoanService _loanService;

    public LoansController(ILoanService loanService)
    {
        _loanService = loanService;
    }

    /// <summary>Kredi başvurusu yap. POST /api/loans</summary>
    [HttpPost]
    public async Task<IActionResult> Apply(LoanApplicationRequest request)
    {
        var loan = await _loanService.ApplyAsync(request);
        return Ok(ApiResponse<LoanDto>.SuccessResponse(loan, "Başvurunuz alındı."));
    }

    /// <summary>Kredilerim. GET /api/loans</summary>
    [HttpGet]
    public async Task<IActionResult> MyLoans()
    {
        var loans = await _loanService.GetMyLoansAsync();
        return Ok(ApiResponse<List<LoanDto>>.SuccessResponse(loans));
    }

    /// <summary>Başvuru detayı (onaylıysa ödeme planıyla). GET /api/loans/{id}</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Detail(Guid id)
    {
        var loan = await _loanService.GetMyLoanDetailAsync(id);
        return Ok(ApiResponse<LoanDto>.SuccessResponse(loan));
    }
}
