using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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
    [EnableRateLimiting("register")]
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var user = await _authService.RegisterAsync(request);
        return Ok(ApiResponse<UserDto>.SuccessResponse(user, "Kayıt başarılı."));
    }

    /// <summary>Giriş yap, JWT token al. POST /api/auth/login</summary>
    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        return Ok(ApiResponse<AuthResponse>.SuccessResponse(result, "Giriş başarılı."));
    }

    /// <summary>
    /// Giriş yapan kullanıcının güncel bilgisi. GET /api/auth/me
    /// Veritabanından okunur (profil güncellenince anında yansır).
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _authService.GetProfileAsync();
        return Ok(ApiResponse<UserDto>.SuccessResponse(user));
    }

    /// <summary>Profil güncelle (Ad Soyad). PUT /api/auth/profile</summary>
    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        var user = await _authService.UpdateProfileAsync(request);
        return Ok(ApiResponse<UserDto>.SuccessResponse(user, "Profil güncellendi."));
    }
}
