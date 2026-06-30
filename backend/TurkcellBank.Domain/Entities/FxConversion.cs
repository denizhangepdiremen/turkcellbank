using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Döviz/altın birimleri arasında çapraz dönüşüm kaydı. Hesaplama TL üzerinden
/// yapılır: kaynak birim banka alış kuru ile TL'ye, hedef birim banka satış
/// kuru ile hedef miktara çevrilir.
/// </summary>
public class FxConversion
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    public Currency FromCurrency { get; set; }
    public Currency ToCurrency { get; set; }
    public decimal FromAmount { get; set; }
    public decimal ToAmount { get; set; }
    public decimal TryAmount { get; set; }
    public decimal FromRate { get; set; }
    public decimal ToRate { get; set; }

    public Guid FromAccountId { get; set; }
    public Guid ToAccountId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Channel Channel { get; set; } = Channel.Internet;
    public Guid? PerformedByEmployeeId { get; set; }

    public User? User { get; set; }
}
