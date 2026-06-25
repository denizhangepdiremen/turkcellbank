using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Loans;
using TurkcellBank.Application.Features.Loans.Dtos;
using TurkcellBank.Application.Features.Transactions;
using TurkcellBank.Application.Features.Transactions.Dtos;
using TurkcellBank.Application.Features.Cards;
using TurkcellBank.Application.Features.Cards.Dtos;

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
    private readonly ITransferApprovalService _transferApproval;
    private readonly ICardService _cardService;

    public ApprovalsController(
        ILoanService loanService,
        ITransferApprovalService transferApproval,
        ICardService cardService)
    {
        _loanService = loanService;
        _transferApproval = transferApproval;
        _cardService = cardService;
    }

    /// <summary>Onay bekleyen krediler (görünüm + CanApprove). GET /api/approvals/loans</summary>
    [HttpGet("loans")]
    public async Task<IActionResult> PendingLoans()
    {
        var loans = await _loanService.GetPendingApprovalsAsync();
        return Ok(ApiResponse<List<PendingLoanDto>>.SuccessResponse(loans));
    }

    /// <summary>Karara bağlanmış krediler (onay/ret geçmişi). GET /api/approvals/loans/history</summary>
    [HttpGet("loans/history")]
    public async Task<IActionResult> LoanHistory()
    {
        var loans = await _loanService.GetDecidedAsync();
        return Ok(ApiResponse<List<LoanHistoryDto>>.SuccessResponse(loans));
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

    // --- Yüksek tutarlı havale onayı (yalnızca şube müdürü) ---

    /// <summary>Onay bekleyen havaleler. GET /api/approvals/transfers</summary>
    [HttpGet("transfers")]
    public async Task<IActionResult> PendingTransfers()
    {
        var transfers = await _transferApproval.GetPendingAsync();
        return Ok(ApiResponse<List<PendingTransferDto>>.SuccessResponse(transfers));
    }

    /// <summary>Karara bağlanmış havaleler (onay/ret geçmişi). GET /api/approvals/transfers/history</summary>
    [HttpGet("transfers/history")]
    public async Task<IActionResult> TransferHistory()
    {
        var transfers = await _transferApproval.GetDecidedAsync();
        return Ok(ApiResponse<List<TransferHistoryDto>>.SuccessResponse(transfers));
    }

    /// <summary>Havaleyi onayla (gerçekleştir). POST /api/approvals/transfers/{id}/approve</summary>
    [HttpPost("transfers/{id:guid}/approve")]
    public async Task<IActionResult> ApproveTransfer(Guid id, [FromBody] ApprovalDecisionRequest? request)
    {
        var tx = await _transferApproval.ApproveAsync(id, request?.Note);
        return Ok(ApiResponse<TransactionDto>.SuccessResponse(tx, "Havale onaylandı ve gerçekleştirildi."));
    }

    /// <summary>Havaleyi reddet. POST /api/approvals/transfers/{id}/reject</summary>
    [HttpPost("transfers/{id:guid}/reject")]
    public async Task<IActionResult> RejectTransfer(Guid id, [FromBody] ApprovalDecisionRequest? request)
    {
        await _transferApproval.RejectAsync(id, request?.Note);
        return Ok(ApiResponse<string>.SuccessResponse("ok", "Havale reddedildi."));
    }

    // --- Kart başvuru onayı (şube müdürü) ---

    /// <summary>Onay bekleyen kart başvuruları. GET /api/approvals/cards</summary>
    [HttpGet("cards")]
    public async Task<IActionResult> PendingCards()
    {
        var cards = await _cardService.GetPendingCardsAsync();
        return Ok(ApiResponse<List<AdminCardDto>>.SuccessResponse(cards));
    }

    /// <summary>Karara bağlanmış kart başvuruları (onay/ret geçmişi). GET /api/approvals/cards/history</summary>
    [HttpGet("cards/history")]
    public async Task<IActionResult> CardHistory()
    {
        var cards = await _cardService.GetDecidedCardsAsync();
        return Ok(ApiResponse<List<AdminCardDto>>.SuccessResponse(cards));
    }

    /// <summary>Kartı onayla. POST /api/approvals/cards/{id}/approve</summary>
    [HttpPost("cards/{id:guid}/approve")]
    public async Task<IActionResult> ApproveCard(Guid id)
    {
        var card = await _cardService.ApproveAsync(id);
        return Ok(ApiResponse<CardDto>.SuccessResponse(card, "Kart onaylandı."));
    }

    /// <summary>Kartı reddet. POST /api/approvals/cards/{id}/reject</summary>
    [HttpPost("cards/{id:guid}/reject")]
    public async Task<IActionResult> RejectCard(Guid id)
    {
        var card = await _cardService.RejectAsync(id);
        return Ok(ApiResponse<CardDto>.SuccessResponse(card, "Kart reddedildi."));
    }
}
