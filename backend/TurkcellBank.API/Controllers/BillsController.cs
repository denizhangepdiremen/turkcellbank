using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Bills;
using TurkcellBank.Application.Features.Bills.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>Fatura ödeme. Tümü [Authorize].</summary>
[ApiController]
[Route("api/bills")]
[Authorize]
public class BillsController : ControllerBase
{
    private readonly IBillService _service;

    public BillsController(IBillService service)
    {
        _service = service;
    }

    /// <summary>Fatura ödenebilen kurum kataloğu. GET /api/bills/billers</summary>
    [HttpGet("billers")]
    public IActionResult Billers()
    {
        var billers = _service.GetBillers();
        return Ok(ApiResponse<List<BillerDto>>.SuccessResponse(billers));
    }

    /// <summary>Fatura sorgula. POST /api/bills/inquiry</summary>
    [HttpPost("inquiry")]
    public async Task<IActionResult> Inquire(BillInquiryRequest request)
    {
        var result = await _service.InquireAsync(request);
        return Ok(ApiResponse<BillInquiryDto>.SuccessResponse(result));
    }

    /// <summary>Fatura öde. POST /api/bills</summary>
    [HttpPost]
    public async Task<IActionResult> Pay(PayBillRequest request)
    {
        var result = await _service.PayAsync(request);
        return Ok(ApiResponse<BillPaymentDto>.SuccessResponse(result, "Fatura ödendi."));
    }

    /// <summary>Fatura ödeme geçmişim. GET /api/bills</summary>
    [HttpGet]
    public async Task<IActionResult> Mine()
    {
        var list = await _service.GetMyPaymentsAsync();
        return Ok(ApiResponse<List<BillPaymentDto>>.SuccessResponse(list));
    }

    /// <summary>Tüm fatura ödemeleri (yönetici görünümü). GET /api/bills/all</summary>
    [HttpGet("all")]
    [Authorize(Roles = "Admin,Director")]
    public async Task<IActionResult> All()
    {
        var list = await _service.GetAllPaymentsAsync();
        return Ok(ApiResponse<List<AdminBillPaymentDto>>.SuccessResponse(list));
    }
}
