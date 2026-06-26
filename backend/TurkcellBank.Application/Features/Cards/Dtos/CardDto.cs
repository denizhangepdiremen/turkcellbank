namespace TurkcellBank.Application.Features.Cards.Dtos;

/// <summary>Müşteriye dönülen kart bilgisi.</summary>
public record CardDto(
    Guid Id,
    string MaskedCardNumber,
    int ExpiryMonth,
    int ExpiryYear,
    string Status,
    string AccountIban,
    bool OnlineShoppingEnabled,
    DateTime CreatedAt);

/// <summary>Admin listesi için: kart sahibiyle birlikte.</summary>
public record AdminCardDto(
    Guid Id,
    string HolderName,
    string HolderEmail,
    string MaskedCardNumber,
    string AccountIban,
    string Status,
    DateTime CreatedAt,
    DateTime? DecidedAt);
