namespace TurkcellBank.Application.Features.Auth.Dtos;

/// <summary>
/// Kayıt isteğinin gövdesi (frontend'den gelen JSON bu yapıya bağlanır).
/// record = sade, değişmez veri taşıyıcı.
/// </summary>
public record RegisterRequest(string FullName, string Email, string Password);
