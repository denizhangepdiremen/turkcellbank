using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Bir döviz/altın alış-satış kaydı (dekont kaynağı). Her işlem iki hesabı
/// ilgilendirir: TL hesabı ve döviz/altın hesabı. Ayrıca her bacak için birer
/// <see cref="Transaction"/> satırı yazılır (hesap geçmişinde görünsün diye).
/// </summary>
public class FxTrade
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public FxTradeSide Side { get; set; }

    // İşlem yapılan döviz/altın birimi (TRY dışı).
    public Currency Currency { get; set; }

    // Döviz/altın miktarı (Currency birimi cinsinden) ve uygulanan kur.
    public decimal Amount { get; set; }
    public decimal Rate { get; set; }

    // İşlemin TL karşılığı (Amount * Rate).
    public decimal TryAmount { get; set; }

    // Bacakların hesapları.
    public Guid TryAccountId { get; set; }
    public Guid ForeignAccountId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Channel Channel { get; set; } = Channel.Internet;
    public Guid? PerformedByEmployeeId { get; set; }

    public User? User { get; set; }
}
