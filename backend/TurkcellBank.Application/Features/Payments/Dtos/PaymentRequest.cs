namespace TurkcellBank.Application.Features.Payments.Dtos;

/// <summary>Sanal POS ödeme isteği.</summary>
public record PaymentRequest(
    string CardNumber,
    int ExpiryMonth,
    int ExpiryYear,
    string Cvv,
    decimal Amount,
    string ThreeDSCode,
    string? Description);
