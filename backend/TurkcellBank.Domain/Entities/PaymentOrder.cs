using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Düzenli ödeme talimatı. Aylık olarak (her ayın <see cref="DayOfMonth"/> günü)
/// otomatik çalıştırılır: ya bir faturayı öder (<see cref="PaymentOrderType.AutoBill"/>)
/// ya da bir IBAN'a sabit tutar gönderir (<see cref="PaymentOrderType.RecurringTransfer"/>).
///
/// Çalıştırma arka plandaki bir servis tarafından yapılır; bu yüzden işlemler
/// <see cref="Channel.Automatic"/> kanalıyla damgalanır. <see cref="NextRunDate"/>
/// vadesi gelince işlenir, sonra bir sonraki aya ötelenir.
/// </summary>
public class PaymentOrder
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public PaymentOrderType Type { get; set; }

    /// <summary>Kullanıcının verdiği etiket (ör. "Ev kirası", "Doğalgaz").</summary>
    public string Name { get; set; } = string.Empty;

    public Guid SourceAccountId { get; set; } // parası çekilen hesap

    // --- AutoBill alanları (RecurringTransfer'de null) ---
    public BillCategory? Category { get; set; }
    public string? BillerCode { get; set; }
    public string? BillerName { get; set; }
    public string? SubscriberNo { get; set; }

    // --- RecurringTransfer alanları (AutoBill'de null) ---
    public string? TargetIban { get; set; }
    public string? TargetName { get; set; }
    public decimal? Amount { get; set; } // sabit havale tutarı

    public int DayOfMonth { get; set; }      // her ayın kaçında (1-28)
    public DateTime NextRunDate { get; set; } // bir sonraki çalıştırma (UTC, gün başı)
    public bool IsActive { get; set; } = true;

    public DateTime? LastRunAt { get; set; }
    public string? LastStatus { get; set; } // son çalıştırma sonucu ("Başarılı", "Yetersiz bakiye" vb.)

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
