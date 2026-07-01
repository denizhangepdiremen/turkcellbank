using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.CreditCards;
using TurkcellBank.Application.Features.CreditCards.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>Gerçek kredi kartı işlemleri (müşteri). Tümü [Authorize].</summary>
[ApiController]
[Route("api/credit-cards")]
[Authorize]
public class CreditCardsController : ControllerBase
{
    private readonly ICreditCardService _service;

    public CreditCardsController(ICreditCardService service)
    {
        _service = service;
    }

    /// <summary>Kredi kartı başvurusu (limit motorca atanır). POST /api/credit-cards</summary>
    [HttpPost]
    public async Task<IActionResult> Apply(CreditCardApplicationRequest request)
    {
        var card = await _service.ApplyAsync(request);
        return Ok(ApiResponse<CreditCardDto>.SuccessResponse(card, "Kredi kartı başvurunuz alındı."));
    }

    /// <summary>Kredi kartlarım. GET /api/credit-cards</summary>
    [HttpGet]
    public async Task<IActionResult> MyCards()
    {
        var cards = await _service.GetMineAsync();
        return Ok(ApiResponse<List<CreditCardDto>>.SuccessResponse(cards));
    }

    /// <summary>Kartın dönem ekstreleri. GET /api/credit-cards/{id}/statements</summary>
    [HttpGet("{id:guid}/statements")]
    public async Task<IActionResult> Statements(Guid id)
    {
        var statements = await _service.GetStatementsAsync(id);
        return Ok(ApiResponse<List<CreditCardStatementDto>>.SuccessResponse(statements));
    }

    /// <summary>Kart hareketleri (ekstre kalemleri + ödemeler). GET /api/credit-cards/{id}/transactions</summary>
    [HttpGet("{id:guid}/transactions")]
    public async Task<IActionResult> Transactions(Guid id)
    {
        var txs = await _service.GetTransactionsAsync(id);
        return Ok(ApiResponse<List<CreditCardTransactionDto>>.SuccessResponse(txs));
    }

    /// <summary>Kredi kartı borcu öde (TL hesaptan). POST /api/credit-cards/{id}/pay</summary>
    [HttpPost("{id:guid}/pay")]
    public async Task<IActionResult> Pay(Guid id, [FromBody] PayCreditCardBody body)
    {
        var card = await _service.PayAsync(new PayCreditCardRequest(id, body.SourceAccountId, body.Amount));
        return Ok(ApiResponse<CreditCardDto>.SuccessResponse(card, "Ödemeniz alındı."));
    }

    /// <summary>Kredi kartından TL hesaba nakit avans kullan. POST /api/credit-cards/{id}/cash-advance</summary>
    [HttpPost("{id:guid}/cash-advance")]
    public async Task<IActionResult> CashAdvance(Guid id, [FromBody] CreditCardCashAdvanceBody body)
    {
        var card = await _service.CashAdvanceAsync(new CreditCardCashAdvanceRequest(id, body.TargetAccountId, body.Amount));
        return Ok(ApiResponse<CreditCardDto>.SuccessResponse(card, "Nakit avans hesabınıza aktarıldı."));
    }

    /// <summary>Kredi kartı limit artış talebi. POST /api/credit-cards/{id}/limit-increase-requests</summary>
    [HttpPost("{id:guid}/limit-increase-requests")]
    public async Task<IActionResult> RequestLimitIncrease(Guid id, [FromBody] CreditCardLimitIncreaseBody body)
    {
        var request = await _service.RequestLimitIncreaseAsync(new CreditCardLimitIncreaseRequestDto(
            id, body.RequestedLimit, body.Age, body.MaritalStatus, body.ChildrenCount,
            body.HousingStatus, body.Income, body.MonthlyExpenses, body.EmploymentMonths, body.Profession));
        return Ok(ApiResponse<CreditCardLimitIncreaseDto>.SuccessResponse(request, "Limit artış talebiniz alındı."));
    }

    /// <summary>Kredi kartı limit artış taleplerim. GET /api/credit-cards/{id}/limit-increase-requests</summary>
    [HttpGet("{id:guid}/limit-increase-requests")]
    public async Task<IActionResult> LimitIncreaseRequests(Guid id)
    {
        var requests = await _service.GetLimitIncreaseRequestsAsync(id);
        return Ok(ApiResponse<List<CreditCardLimitIncreaseDto>>.SuccessResponse(requests));
    }

    /// <summary>Kartın internet alışverişini aç/kapat. PATCH /api/credit-cards/{id}/online-shopping</summary>
    [HttpPatch("{id:guid}/online-shopping")]
    public async Task<IActionResult> SetOnlineShopping(Guid id, [FromBody] SetCreditOnlineShoppingRequest request)
    {
        var card = await _service.SetOnlineShoppingAsync(id, request.Enabled);
        var msg = request.Enabled ? "İnternet alışverişi açıldı." : "İnternet alışverişi kapatıldı.";
        return Ok(ApiResponse<CreditCardDto>.SuccessResponse(card, msg));
    }
}

/// <summary>Kredi kartı borç ödeme gövdesi (kart id route'tan gelir).</summary>
public record PayCreditCardBody(Guid SourceAccountId, decimal Amount);

/// <summary>Kredi kartı nakit avans gövdesi.</summary>
public record CreditCardCashAdvanceBody(Guid TargetAccountId, decimal Amount);

/// <summary>Kredi kartı limit artış talebi gövdesi.</summary>
public record CreditCardLimitIncreaseBody(
    decimal RequestedLimit,
    int Age,
    TurkcellBank.Domain.Enums.MaritalStatus MaritalStatus,
    int ChildrenCount,
    TurkcellBank.Domain.Enums.HousingStatus HousingStatus,
    decimal Income,
    decimal MonthlyExpenses,
    int EmploymentMonths,
    string Profession);

/// <summary>Kredi kartı internet alışverişi aç/kapat isteği.</summary>
public record SetCreditOnlineShoppingRequest(bool Enabled);
