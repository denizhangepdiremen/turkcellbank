using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Cards;
using TurkcellBank.Application.Features.Cards.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>Banka kartı işlemleri (müşteri). Tümü [Authorize].</summary>
[ApiController]
[Route("api/cards")]
[Authorize]
public class CardsController : ControllerBase
{
    private readonly ICardService _cardService;

    public CardsController(ICardService cardService)
    {
        _cardService = cardService;
    }

    /// <summary>Hesaba bağlı kart aç (admin onayı bekler). POST /api/cards</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreateCardRequest request)
    {
        var card = await _cardService.CreateAsync(request);
        return Ok(ApiResponse<CardDto>.SuccessResponse(card, "Kart başvurunuz alındı."));
    }

    /// <summary>Kartlarım. GET /api/cards</summary>
    [HttpGet]
    public async Task<IActionResult> MyCards()
    {
        var cards = await _cardService.GetMyCardsAsync();
        return Ok(ApiResponse<List<CardDto>>.SuccessResponse(cards));
    }
}
