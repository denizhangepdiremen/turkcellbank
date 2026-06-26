using TurkcellBank.Application.Features.Auth.Dtos;

namespace TurkcellBank.Application.Features.Auth;

/// <summary>
/// Kimlik doğrulama iş mantığı arayüzü.
/// Controller bu arayüzü çağırır; gerçek mantık AuthService'tedir.
/// </summary>
public interface IAuthService
{
    Task<UserDto> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);

    // Giriş yapan kullanıcının güncel profili (veritabanından)
    Task<UserDto> GetProfileAsync();

    // Profil güncelleme (şimdilik Ad Soyad)
    Task<UserDto> UpdateProfileAsync(UpdateProfileRequest request);

    // Giriş yapan kullanıcının şifresini değiştirir (mevcut şifre doğrulanır)
    Task ChangePasswordAsync(ChangePasswordRequest request);

    // Günlük internet havale limitini ayarlar (null = limitsiz)
    Task<UserDto> SetTransferLimitAsync(SetTransferLimitRequest request);
}
