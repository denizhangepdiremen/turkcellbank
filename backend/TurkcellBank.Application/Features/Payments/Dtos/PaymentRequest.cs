namespace TurkcellBank.Application.Features.Payments.Dtos;

/// <summary>
/// Sanal POS ödeme isteği. Kullanıcı ödeme aracını seçer:
///  - <c>Instrument = "debit"</c>: banka kartı — tutar karta bağlı hesaptan düşülür.
///  - <c>Instrument = "credit"</c>: kredi kartı — tutar kart limitinden harcanır,
///    <see cref="Installments"/> taksitle (peşin = 1) borca yazılır.
/// </summary>
public record PaymentRequest(
    Guid? CardId,                    // debit kart (Instrument = "debit")
    decimal Amount,
    string ThreeDSCode,
    string? Description,
    string Instrument = "debit",     // "debit" | "credit"
    Guid? CreditCardId = null,       // kredi kartı (Instrument = "credit")
    int Installments = 1);           // kredi kartı taksit sayısı (1..12)
