using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Sanal POS ödeme kaydı. Kart simülasyonu — banka hesabına dokunmaz.
/// Ham kart numarası SAKLANMAZ; sadece maskeli hali ve fraud eşleştirmesi
/// için bir hash (fingerprint) tutulur.
/// </summary>
public class Payment
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; } // ödeyen (admin listesinde gösterilir)

    public string MaskedCardNumber { get; set; } = string.Empty; // **** **** **** 3456
    public string CardFingerprint { get; set; } = string.Empty;  // kart no'nun hash'i

    public decimal Amount { get; set; }
    public PaymentStatus Status { get; set; }
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
