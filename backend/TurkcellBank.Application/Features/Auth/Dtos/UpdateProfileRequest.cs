namespace TurkcellBank.Application.Features.Auth.Dtos;

/// <summary>Profil güncelleme isteği (şimdilik sadece Ad Soyad).</summary>
public record UpdateProfileRequest(string FullName);
