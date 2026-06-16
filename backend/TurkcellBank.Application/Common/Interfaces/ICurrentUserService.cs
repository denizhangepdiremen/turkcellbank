namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>
/// Şu anda giriş yapmış (token sahibi) kullanıcının bilgisine erişim.
/// Gerçek uygulaması API'de (token claim'lerinden okur).
/// Application "HTTP/token" detayını bilmeden mevcut kullanıcının id'sini alır.
/// </summary>
public interface ICurrentUserService
{
    Guid UserId { get; }
}
