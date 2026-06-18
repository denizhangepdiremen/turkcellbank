namespace TurkcellBank.Domain.Enums;

/// <summary>Sanal POS ödeme durumu.</summary>
public enum PaymentStatus
{
    Success,   // başarılı
    Failed,    // başarısız (kart/3DS hatalı)
    Refunded,  // iade edildi (admin)
}
