using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Fx;
using TurkcellBank.Application.Features.Fx.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>Döviz &amp; altın: kur tahtası, fiyat sorgu, al/sat. Tümü [Authorize].</summary>
[ApiController]
[Route("api/fx")]
[Authorize]
public class FxController : ControllerBase
{
    private readonly IFxService _service;

    public FxController(IFxService service)
    {
        _service = service;
    }

    /// <summary>Güncel kur tahtası. GET /api/fx/rates</summary>
    [HttpGet("rates")]
    public async Task<IActionResult> Rates()
    {
        var rates = await _service.GetRatesAsync();
        return Ok(ApiResponse<List<ExchangeRateDto>>.SuccessResponse(rates));
    }

    /// <summary>Anlık fiyat sorgusu. POST /api/fx/quote</summary>
    [HttpPost("quote")]
    public async Task<IActionResult> Quote(FxQuoteRequest request)
    {
        var quote = await _service.GetQuoteAsync(request);
        return Ok(ApiResponse<FxQuoteDto>.SuccessResponse(quote));
    }

    /// <summary>Döviz/altın al ya da sat. POST /api/fx/trade</summary>
    [HttpPost("trade")]
    public async Task<IActionResult> Trade(FxTradeRequest request)
    {
        var trade = await _service.TradeAsync(request);
        var msg = trade.Side == Domain.Enums.FxTradeSide.Buy ? "Alış gerçekleşti." : "Satış gerçekleşti.";
        return Ok(ApiResponse<FxTradeDto>.SuccessResponse(trade, msg));
    }

    /// <summary>Döviz/altın işlem geçmişim. GET /api/fx/trades</summary>
    [HttpGet("trades")]
    public async Task<IActionResult> Trades()
    {
        var list = await _service.GetMyTradesAsync();
        return Ok(ApiResponse<List<FxTradeDto>>.SuccessResponse(list));
    }
}
