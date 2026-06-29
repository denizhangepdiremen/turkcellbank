using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Vadeli mevduat hesabı. Açılışta anapara kaynak hesaptan çekilir (kilitlenir);
/// vade dolunca anapara + net faiz (stopaj düşülmüş) aynı hesaba döner. Vade
/// dolumu arka plandaki bir servis tarafından işlenir.
///
/// Faiz açılışta sabitlenir (basit faiz): brüt = anapara * yıllık oran * gün/365.
/// Stopaj brüt faizden kesilir; hesaba net faiz yansır. Vadeden önce bozulursa
/// faiz ödenmez, yalnızca anapara döner.
/// </summary>
public class TimeDeposit
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid SourceAccountId { get; set; } // anaparanın çekildiği ve döneceği hesap

    public decimal Principal { get; set; }        // anapara
    public decimal AnnualRate { get; set; }       // yıllık brüt faiz oranı (0.45 = %45)
    public int TermDays { get; set; }             // vade (gün)

    public decimal GrossInterest { get; set; }    // brüt faiz (açılışta hesaplanır)
    public decimal WithholdingTax { get; set; }   // stopaj (brüt faizden kesinti)
    public decimal NetInterest { get; set; }      // net faiz (brüt - stopaj)

    public TimeDepositStatus Status { get; set; } = TimeDepositStatus.Active;

    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
    public DateTime MaturityDate { get; set; }    // vade sonu (UTC)
    public DateTime? ClosedAt { get; set; }       // vade dolumu / erken bozma anı
}
