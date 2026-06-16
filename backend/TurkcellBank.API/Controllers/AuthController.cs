using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Auth;
using TurkcellBank.Application.Features.Auth.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>
/// Kimlik doğrulama endpoint'leri (kayıt, giriş, profil).
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

    /// <summary>Giriş yap, JWT token al. POST /api/auth/login</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        return Ok(ApiResponse<AuthResponse>.SuccessResponse(result, "Giriş başarılı."));
    }

    /// <summary>
    /// Giriş yapan kullanıcının bilgisi. GET /api/auth/me
    /// [Authorize] = sadece geçerli JWT token ile erişilebilir.
    /// Bilgiyi token'ın içindeki claim'lerden okuruz (DB'ye gerek yok).
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        var user = new UserDto(
            Id: Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!),
            FullName: User.FindFirstValue(ClaimTypes.Name) ?? string.Empty,
            Email: User.FindFirstValue(ClaimTypes.Email) ?? string.Empty,
            Role: User.FindFirstValue(ClaimTypes.Role) ?? string.Empty);

        return Ok(ApiResponse<UserDto>.SuccessResponse(user));
    }
}
