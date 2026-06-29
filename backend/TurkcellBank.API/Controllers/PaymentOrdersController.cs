using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.PaymentOrders;
using TurkcellBank.Application.Features.PaymentOrders.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>Düzenli ödeme talimatları. Tümü [Authorize].</summary>
[ApiController]
[Route("api/payment-orders")]
[Authorize]
public class PaymentOrdersController : ControllerBase
{
    private readonly IPaymentOrderService _service;

    public PaymentOrdersController(IPaymentOrderService service)
    {
        _service = service;
    }

    /// <summary>Talimatlarım. GET /api/payment-orders</summary>
    [HttpGet]
    public async Task<IActionResult> Mine()
    {
        var list = await _service.GetMineAsync();
        return Ok(ApiResponse<List<PaymentOrderDto>>.SuccessResponse(list));
    }

    /// <summary>Yeni talimat oluştur. POST /api/payment-orders</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreatePaymentOrderRequest request)
    {
        var order = await _service.CreateAsync(request);
        return Ok(ApiResponse<PaymentOrderDto>.SuccessResponse(order, "Talimat oluşturuldu."));
    }

    /// <summary>Talimatı aktif/pasif yap. PUT /api/payment-orders/{id}/active</summary>
    [HttpPut("{id:guid}/active")]
    public async Task<IActionResult> SetActive(Guid id, [FromBody] SetActiveRequest body)
    {
        var order = await _service.SetActiveAsync(id, body.IsActive);
        return Ok(ApiResponse<PaymentOrderDto>.SuccessResponse(
            order, order.IsActive ? "Talimat etkinleştirildi." : "Talimat duraklatıldı."));
    }

    /// <summary>Talimatı sil. DELETE /api/payment-orders/{id}</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse<string>.SuccessResponse("ok", "Talimat silindi."));
    }

    public record SetActiveRequest(bool IsActive);
}
