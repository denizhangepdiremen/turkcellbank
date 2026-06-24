using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Accounts.Dtos;
using TurkcellBank.Application.Features.Branch.Dtos;
using TurkcellBank.Application.Features.Management;
using TurkcellBank.Application.Features.Management.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>
/// Yönetici müşteri hesabı işlemleri: müşteri arama + banka bloğu (dondur/aç).
/// Şube/il müdürü ve direktör erişebilir.
/// </summary>
[ApiController]
[Route("api/management")]
[Authorize(Roles = "BranchManager,ProvincialManager,Director")]
public class ManagementController : ControllerBase
{
    private readonly IManagerService _manager;

    public ManagementController(IManagerService manager)
    {
        _manager = manager;
    }

    /// <summary>Müşteri ara (TC/e-posta) + hesaplarını getir. GET /api/management/customer?query=</summary>
    [HttpGet("customer")]
    public async Task<IActionResult> SearchCustomer([FromQuery] string query)
    {
        var result = await _manager.SearchCustomerAsync(query);
        return Ok(ApiResponse<CustomerLookupDto>.SuccessResponse(result));
    }

    /// <summary>Hesaba banka bloğu koy. POST /api/management/accounts/{id}/freeze</summary>
    [HttpPost("accounts/{id:guid}/freeze")]
    public async Task<IActionResult> Freeze(Guid id, BankFreezeRequest request)
    {
        var account = await _manager.BankFreezeAsync(id, request);
        return Ok(ApiResponse<AccountDto>.SuccessResponse(account, "Hesap donduruldu."));
    }

    /// <summary>Banka bloğunu kaldır. POST /api/management/accounts/{id}/unfreeze</summary>
    [HttpPost("accounts/{id:guid}/unfreeze")]
    public async Task<IActionResult> Unfreeze(Guid id)
    {
        var account = await _manager.BankUnfreezeAsync(id);
        return Ok(ApiResponse<AccountDto>.SuccessResponse(account, "Hesap yeniden aktifleştirildi."));
    }
}
