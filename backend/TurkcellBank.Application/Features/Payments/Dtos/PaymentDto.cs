namespace TurkcellBank.Application.Features.Payments.Dtos;

/// <summary>Müşteriye dönülen ödeme bilgisi.</summary>
public record PaymentDto(
    Guid Id,
    Guid? CardId, // ödemenin yapıldığı kart (kart ekstresini filtrelemek için)
    string MaskedCardNumber,
    decimal Amount,
    string Status,
    string? Description,
    DateTime CreatedAt);

/// <summary>Admin listesi için: ödeyen bilgisiyle.</summary>
public record AdminPaymentDto(
    Guid Id,
    string PayerName,
    string PayerEmail,
    string MaskedCardNumber,
    decimal Amount,
    string Status,
    string? Description,
    DateTime CreatedAt);
