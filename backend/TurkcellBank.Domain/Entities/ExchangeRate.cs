using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Bir para biriminin TL karşısındaki güncel kuru (1 birim = ? TL).
/// Alış (banka müşteriden alır) &lt; Satış (banka müşteriye satar) — aradaki fark
/// bankanın spread'i. <see cref="BaseMid"/> referans ortalamadır; arka plan
/// servisi güncel kuru bu referansın etrafında küçük adımlarla oynatır.
/// </summary>
public class ExchangeRate
{
    public Guid Id { get; set; }

    public Currency Currency { get; set; }

    // 1 birim için TL: banka alış (BuyRate) ve satış (SellRate) kurları.
    public decimal BuyRate { get; set; }
    public decimal SellRate { get; set; }

    // Referans ortalama kur — jitter bu değerin ±%3 bandında dolaşır.
    public decimal BaseMid { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
