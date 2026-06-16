namespace TurkcellBank.Application.Features.Auth.Dtos;

/// <summary>
/// Başarılı giriş sonrası dönülen cevap: JWT token + son kullanma zamanı +
/// güvenli kullanıcı bilgisi. Frontend token'ı saklayıp sonraki isteklerde gönderir.
/// </summary>
public record AuthResponse(string Token, DateTime ExpiresAt, UserDto User);
