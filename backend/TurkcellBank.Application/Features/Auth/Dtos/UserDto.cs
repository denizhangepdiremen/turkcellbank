namespace TurkcellBank.Application.Features.Auth.Dtos;

/// <summary>
/// Dışarıya dönülen güvenli kullanıcı bilgisi.
/// PasswordHash gibi hassas alanları İÇERMEZ (PDF: entity doğrudan dönülmez).
/// </summary>
public record UserDto(Guid Id, string FullName, string Email, string Role);
