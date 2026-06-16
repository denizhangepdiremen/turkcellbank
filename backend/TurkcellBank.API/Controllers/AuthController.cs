using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Auth;
using TurkcellBank.Application.Features.Auth.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>
/// Kimlik doğrulama endpoint'leri (kayıt, giriş).
/// İş mantığı IAuthService'te; controller sadece isteği alır ve cevabı sarar.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>Yeni kullanıcı kaydı. POST /api/auth/register</summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var user = await _authService.RegisterAsync(request);
        return Ok(ApiResponse<UserDto>.SuccessResponse(user, "Kayıt başarılı."));
    }
}
