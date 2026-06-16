namespace TurkcellBank.Application.Features.Auth.Dtos;

/// <summary>Giriş isteğinin gövdesi.</summary>
public record LoginRequest(string Email, string Password);
