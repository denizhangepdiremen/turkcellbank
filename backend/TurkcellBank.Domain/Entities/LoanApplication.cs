using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Kredi başvurusu. Başvuru anında otomatik risk skoru hesaplanır;
/// durum "Pending" başlar, admin onaylar/reddeder.
/// </summary>
public class LoanApplication
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; } // başvuran (admin listesinde gösterilir)

    public decimal Income { get; set; }       // aylık gelir
    public string Profession { get; set; } = string.Empty;
    public decimal Amount { get; set; }       // istenen kredi tutarı
    public int TermMonths { get; set; }       // vade (ay)

    public LoanStatus Status { get; set; } = LoanStatus.Pending;
    public int Score { get; set; }            // otomatik risk skoru (0-100)

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DecidedAt { get; set; }  // admin karar verdiği an
}
