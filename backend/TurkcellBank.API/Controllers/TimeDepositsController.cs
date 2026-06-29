using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.TimeDeposits;
using TurkcellBank.Application.Features.TimeDeposits.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>Vadeli mevduat. Tümü [Authorize].</summary>
[ApiController]
[Route("api/time-deposits")]
[Authorize]
public class TimeDepositsController : ControllerBase
{
    private readonly ITimeDepositService _service;

    public TimeDepositsController(ITimeDepositService service)
    {
        _service = service;
    }

    /// <summary>Sunulan vade ürünleri. GET /api/time-deposits/products</summary>
    [HttpGet("products")]
    public IActionResult Products()
    {
        var products = _service.GetProducts();
        return Ok(ApiResponse<List<TimeDepositProductDto>>.SuccessResponse(products));
    }

    /// <summary>Vadeli mevduatlarım. GET /api/time-deposits</summary>
    [HttpGet]
    public async Task<IActionResult> Mine()
    {
        var list = await _service.GetMineAsync();
        return Ok(ApiResponse<List<TimeDepositDto>>.SuccessResponse(list));
    }

    /// <summary>Yeni vadeli mevduat aç. POST /api/time-deposits</summary>
    [HttpPost]
    public async Task<IActionResult> Open(OpenTimeDepositRequest request)
    {
        var deposit = await _service.OpenAsync(request);
        return Ok(ApiResponse<TimeDepositDto>.SuccessResponse(deposit, "Vadeli mevduat açıldı."));
    }

    /// <summary>Vadeli mevduatı erken boz. POST /api/time-deposits/{id}/close</summary>
    [HttpPost("{id:guid}/close")]
    public async Task<IActionResult> CloseEarly(Guid id)
    {
        var deposit = await _service.CloseEarlyAsync(id);
        return Ok(ApiResponse<TimeDepositDto>.SuccessResponse(deposit, "Vadeli mevduat bozuldu."));
    }
}
