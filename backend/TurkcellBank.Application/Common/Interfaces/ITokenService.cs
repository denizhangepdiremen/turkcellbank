using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>
/// JWT token üretimi soyutlaması. Gerçek üretim Infrastructure'da (JwtTokenService).
/// Application "token nasıl üretiliyor" bilmez, sadece bu arayüzü çağırır.
/// </summary>
public interface ITokenService
{
    // Kullanıcı için imzalı bir JWT üretir; token ve son kullanma zamanını döner.
    (string Token, DateTime ExpiresAt) GenerateToken(User user);
}
