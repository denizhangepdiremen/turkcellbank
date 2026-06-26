namespace TurkcellBank.Application.Features.Auth.Dtos;

/// <summary>Günlük internet havale limitini ayarlama isteği. Limit null ise limit kaldırılır.</summary>
public record SetTransferLimitRequest(decimal? Limit);
