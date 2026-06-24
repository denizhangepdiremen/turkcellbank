using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Accounts;
using TurkcellBank.Application.Features.Accounts.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>
/// Hesap işlemleri. Tüm endpoint'ler [Authorize] — sadece giriş yapmış kullanıcı.
/// </summary>
[ApiController]
[Route("api/accounts")]
[Authorize]
public class AccountsController : ControllerBase
{
    private readonly IAccountService _accountService;

    public AccountsController(IAccountService accountService)
    {
        _accountService = accountService;
    }

    /// <summary>Hesap aç. POST /api/accounts</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreateAccountRequest request)
    {
        var account = await _accountService.OpenAccountAsync(request);
        return Ok(ApiResponse<AccountDto>.SuccessResponse(account, "Hesap açıldı."));
    }

    /// <summary>Giriş yapan kullanıcının hesapları. GET /api/accounts</summary>
    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        var accounts = await _accountService.GetMyAccountsAsync();
        return Ok(ApiResponse<List<AccountDto>>.SuccessResponse(accounts));
    }

    /// <summary>
    /// Hesap kapat. POST /api/accounts/{id}/close
    /// Bakiye varsa gövdede hedef hesap (TargetAccountId) gönderilmeli; bağlı kartlar silinir.
    /// </summary>
    [HttpPost("{id:guid}/close")]
    public async Task<IActionResult> Close(Guid id, CloseAccountRequest request)
    {
        var account = await _accountService.CloseAccountAsync(id, request);
        return Ok(ApiResponse<AccountDto>.SuccessResponse(account, "Hesap kapatıldı."));
    }

    /// <summary>Hesabı dondur (deaktive et). POST /api/accounts/{id}/freeze</summary>
    [HttpPost("{id:guid}/freeze")]
    public async Task<IActionResult> Freeze(Guid id)
    {
        var account = await _accountService.FreezeAccountAsync(id);
        return Ok(ApiResponse<AccountDto>.SuccessResponse(account, "Hesap donduruldu."));
    }

    /// <summary>Dondurulmuş hesabı yeniden aktifleştir. POST /api/accounts/{id}/reactivate</summary>
    [HttpPost("{id:guid}/reactivate")]
    public async Task<IActionResult> Reactivate(Guid id)
    {
        var account = await _accountService.ReactivateAccountAsync(id);
        return Ok(ApiResponse<AccountDto>.SuccessResponse(account, "Hesap yeniden aktifleştirildi."));
    }
}
