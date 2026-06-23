namespace TurkcellBank.Application.Features.Auth.Dtos;

/// <summary>
/// Dışarıya dönülen güvenli kullanıcı bilgisi.
/// PasswordHash gibi hassas alanları İÇERMEZ (PDF: entity doğrudan dönülmez).
/// <paramref name="City"/> sadece personelde dolu olur (müşteri/admin için null).
/// </summary>
public record UserDto(Guid Id, string FullName, string Email, string Role, string? City);
