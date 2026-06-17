namespace TurkcellBank.Application.Features.Transactions.Dtos;

/// <summary>Transfer isteği: gönderen hesap, alıcı IBAN, tutar, açıklama.</summary>
public record TransferRequest(
    Guid FromAccountId,
    string ToIban,
    decimal Amount,
    string? Description);
