using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Banka (debit) kartı. Bir hesaba bağlıdır; kart no/CVV/son kullanma otomatik
/// üretilir. Admin onayından sonra ödeme yapılabilir. Ödemede tutar bağlı
/// hesaptan düşülür.
/// (Eğitim simülasyonu — gerçek sistemlerde CVV/kart no şifreli/tokenize tutulur.)
/// </summary>
public class Card
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    // Bağlı (parası çekilecek) hesap
    public Guid AccountId { get; set; }
    public Account? Account { get; set; }

    public string CardNumber { get; set; } = string.Empty; // 16 hane, benzersiz
    public int ExpiryMonth { get; set; }
    public int ExpiryYear { get; set; }
    public string Cvv { get; set; } = string.Empty;

    public CardStatus Status { get; set; } = CardStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DecidedAt { get; set; }
}
