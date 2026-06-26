namespace TurkcellBank.Application.Features.Auth.Dtos;

/// <summary>
/// Dışarıya dönülen güvenli kullanıcı bilgisi.
/// PasswordHash gibi hassas alanları İÇERMEZ (PDF: entity doğrudan dönülmez).
/// <paramref name="NationalId"/> kullanıcının kayıtlı TC kimlik numarasıdır.
/// <paramref name="City"/> sadece personelde dolu olur (müşteri/admin için null).
/// <paramref name="DailyTransferLimit"/> müşterinin günlük internet havale limiti (null = limitsiz).
/// </summary>
public record UserDto(
    Guid Id,
    string FullName,
    string Email,
    string NationalId,
    string Role,
    string? City,
    DateTime CreatedAt,
    decimal? DailyTransferLimit = null);
