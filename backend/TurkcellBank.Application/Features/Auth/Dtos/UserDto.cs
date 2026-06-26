namespace TurkcellBank.Application.Features.Auth.Dtos;

/// <summary>
/// Dışarıya dönülen güvenli kullanıcı bilgisi.
/// PasswordHash gibi hassas alanları İÇERMEZ (PDF: entity doğrudan dönülmez).
/// <paramref name="City"/> sadece personelde dolu olur (müşteri/admin için null).
/// <paramref name="DailyTransferLimit"/> müşterinin günlük internet havale limiti (null = limitsiz).
/// </summary>
public record UserDto(Guid Id, string FullName, string Email, string Role, string? City, DateTime CreatedAt, decimal? DailyTransferLimit = null);
