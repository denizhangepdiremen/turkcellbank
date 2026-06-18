namespace TurkcellBank.Application.Features.Payments.Dtos;

/// <summary>
/// Sanal POS ödeme isteği. Kullanıcı onaylı kartlarından birini seçer;
/// tutar karta bağlı hesaptan düşülür.
/// </summary>
public record PaymentRequest(
    Guid CardId,
    decimal Amount,
    string ThreeDSCode,
    string? Description);
