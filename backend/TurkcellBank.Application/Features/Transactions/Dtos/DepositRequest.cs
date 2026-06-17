namespace TurkcellBank.Application.Features.Transactions.Dtos;

/// <summary>Para yatırma isteği: hangi hesaba, ne kadar.</summary>
public record DepositRequest(Guid AccountId, decimal Amount);
