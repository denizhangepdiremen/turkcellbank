namespace TurkcellBank.Application.Features.Auth.Dtos;

/// <summary>Şifre değiştirme isteği (giriş yapmış kullanıcı için).</summary>
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
