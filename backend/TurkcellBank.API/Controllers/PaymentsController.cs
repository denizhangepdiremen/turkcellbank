using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Payments;
using TurkcellBank.Application.Features.Payments.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>Sanal POS ödeme işlemleri (müşteri). Tümü [Authorize].</summary>
[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    /// <summary>Kartla ödeme yap. POST /api/payments</summary>
    [HttpPost]
    public async Task<IActionResult> Pay(PaymentRequest request)
    {
        var payment = await _paymentService.PayAsync(request);
        return Ok(ApiResponse<PaymentDto>.SuccessResponse(payment, "Ödeme başarılı."));
    }

    /// <summary>Ödeme geçmişim. GET /api/payments</summary>
    [HttpGet]
    public async Task<IActionResult> MyPayments()
    {
        var payments = await _paymentService.GetMyPaymentsAsync();
        return Ok(ApiResponse<List<PaymentDto>>.SuccessResponse(payments));
    }
}
