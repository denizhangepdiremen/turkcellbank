namespace TurkcellBank.Application.Features.Cards.Dtos;

/// <summary>Kart açma isteği: hangi hesaba bağlanacak.</summary>
public record CreateCardRequest(Guid AccountId);
