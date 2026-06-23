using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Admin;
using TurkcellBank.Application.Features.Auth.Dtos;
using TurkcellBank.Application.Features.Loans;
using TurkcellBank.Application.Features.Loans.Dtos;
using TurkcellBank.Application.Features.Payments;
using TurkcellBank.Application.Features.Payments.Dtos;
using TurkcellBank.Application.Features.Cards;
using TurkcellBank.Application.Features.Cards.Dtos;

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
    private readonly IPaymentService _paymentService;
    private readonly ICardService _cardService;

    public AdminController(
        IAdminService adminService,
        ILoanService loanService,
        IPaymentService paymentService,
        ICardService cardService)
    {
        _adminService = adminService;
        _loanService = loanService;
        _paymentService = paymentService;
        _cardService = cardService;
    }

    /// <summary>Tüm kullanıcıları listele. GET /api/admin/users</summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _adminService.GetUsersAsync();
        return Ok(ApiResponse<List<UserDto>>.SuccessResponse(users));
    }

    /// <summary>
    /// Tüm kredi başvuruları (başvuranla) — admin için SALT-OKUNUR teknik görünüm.
    /// Kredi onay/red yetkisi admin'de değildir; banka hiyerarşisindedir
    /// (bkz. ApprovalsController). GET /api/admin/loans
    /// </summary>
    [HttpGet("loans")]
    public async Task<IActionResult> GetLoans()
    {
        var loans = await _loanService.GetAllLoansAsync();
        return Ok(ApiResponse<List<AdminLoanDto>>.SuccessResponse(loans));
    }

    /// <summary>Tüm ödemeler (ödeyenle). GET /api/admin/payments</summary>
    [HttpGet("payments")]
    public async Task<IActionResult> GetPayments()
    {
        var payments = await _paymentService.GetAllPaymentsAsync();
        return Ok(ApiResponse<List<AdminPaymentDto>>.SuccessResponse(payments));
    }

    /// <summary>Ödemeyi iade et. POST /api/admin/payments/{id}/refund</summary>
    [HttpPost("payments/{id:guid}/refund")]
    public async Task<IActionResult> RefundPayment(Guid id)
    {
        var payment = await _paymentService.RefundAsync(id);
        return Ok(ApiResponse<PaymentDto>.SuccessResponse(payment, "Ödeme iade edildi."));
    }

    /// <summary>Tüm kart başvuruları (sahip + hesapla). GET /api/admin/cards</summary>
    [HttpGet("cards")]
    public async Task<IActionResult> GetCards()
    {
        var cards = await _cardService.GetAllCardsAsync();
        return Ok(ApiResponse<List<AdminCardDto>>.SuccessResponse(cards));
    }

    /// <summary>Kartı onayla. POST /api/admin/cards/{id}/approve</summary>
    [HttpPost("cards/{id:guid}/approve")]
    public async Task<IActionResult> ApproveCard(Guid id)
    {
        var card = await _cardService.ApproveAsync(id);
        return Ok(ApiResponse<CardDto>.SuccessResponse(card, "Kart onaylandı."));
    }

    /// <summary>Kartı reddet. POST /api/admin/cards/{id}/reject</summary>
    [HttpPost("cards/{id:guid}/reject")]
    public async Task<IActionResult> RejectCard(Guid id)
    {
        var card = await _cardService.RejectAsync(id);
        return Ok(ApiResponse<CardDto>.SuccessResponse(card, "Kart reddedildi."));
    }
}
