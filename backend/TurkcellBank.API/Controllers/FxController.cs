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

    /// <summary>Döviz/altın çapraz dönüşüm. POST /api/fx/convert</summary>
    [HttpPost("convert")]
    public async Task<IActionResult> Convert(FxConversionRequest request)
    {
        var conversion = await _service.ConvertAsync(request);
        return Ok(ApiResponse<FxConversionDto>.SuccessResponse(conversion, "Dönüşüm gerçekleşti."));
    }

    /// <summary>Döviz/altın işlem geçmişim. GET /api/fx/trades</summary>
    [HttpGet("trades")]
    public async Task<IActionResult> Trades()
    {
        var list = await _service.GetMyTradesAsync();
        return Ok(ApiResponse<List<FxTradeDto>>.SuccessResponse(list));
    }

    /// <summary>Döviz/altın çapraz dönüşüm geçmişim. GET /api/fx/conversions</summary>
    [HttpGet("conversions")]
    public async Task<IActionResult> Conversions()
    {
        var list = await _service.GetMyConversionsAsync();
        return Ok(ApiResponse<List<FxConversionDto>>.SuccessResponse(list));
    }

    /// <summary>Kur alarmlarım. GET /api/fx/alerts</summary>
    [HttpGet("alerts")]
    public async Task<IActionResult> Alerts()
    {
        var list = await _service.GetMyAlertsAsync();
        return Ok(ApiResponse<List<FxRateAlertDto>>.SuccessResponse(list));
    }

    /// <summary>Yeni kur alarmı oluştur. POST /api/fx/alerts</summary>
    [HttpPost("alerts")]
    public async Task<IActionResult> CreateAlert(CreateFxRateAlertRequest request)
    {
        var alert = await _service.CreateAlertAsync(request);
        return Ok(ApiResponse<FxRateAlertDto>.SuccessResponse(alert, "Kur alarmı oluşturuldu."));
    }

    /// <summary>Kur alarmını sil/pasifleştir. DELETE /api/fx/alerts/{id}</summary>
    [HttpDelete("alerts/{id:guid}")]
    public async Task<IActionResult> DeleteAlert(Guid id)
    {
        await _service.DeleteAlertAsync(id);
        return Ok(ApiResponse<string>.SuccessResponse("ok", "Kur alarmı silindi."));
    }
}
