using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Gerçek kredi kartı (debit karttan bağımsız modül). Bir hesaba bağlı DEĞİLDİR;
/// kendi limiti üzerinden harcama yapılır. Harcama <see cref="CurrentDebt"/>'i
/// anında artırır (limit bloke olur), ödeme azaltır. Dönem ekstresi arka plan
/// worker'ı tarafından kesim gününde (<see cref="StatementDay"/>) oluşturulur.
/// Limit, başvuru sırasında kredi değerlendirme motoru tarafından atanır.
/// (Eğitim simülasyonu — gerçek sistemlerde kart no/CVV tokenize tutulur.)
/// </summary>
public class CreditCard
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string CardNumber { get; set; } = string.Empty; // 16 hane, benzersiz
    public int ExpiryMonth { get; set; }
    public int ExpiryYear { get; set; }
    public string Cvv { get; set; } = string.Empty;

    public CreditCardStatus Status { get; set; } = CreditCardStatus.Pending;

    // Limit muhasebesi (para: TRY)
    public decimal CreditLimit { get; set; }   // toplam tahsis edilen limit
    public decimal CurrentDebt { get; set; }   // ödenmemiş toplam taahhüt (kesilmiş + kesilmemiş)
    // Türetilen (DTO'da hesaplanır): AvailableLimit = CreditLimit - CurrentDebt

    // Ekstre takvimi
    public int StatementDay { get; set; }          // kesim günü (1..28)
    public int DueDayOffset { get; set; } = 10;    // son ödeme = kesim + bu kadar gün
    public DateTime NextStatementDate { get; set; } // bir sonraki kesim (UTC) — worker bunu tarar

    // Müşteri internet/e-ticaret alışverişini açıp kapatabilir
    public bool OnlineShoppingEnabled { get; set; } = true;

    // Başvuru değerlendirmesi (kredi motorundan)
    public int Score { get; set; }
    public string? AiReason { get; set; }

    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DecidedAt { get; set; }

    // İşlem kanalı + adına başvuruda şube çalışanı (denetim/izlenebilirlik)
    public Channel Channel { get; set; } = Channel.Internet;
    public Guid? PerformedByEmployeeId { get; set; }
}
