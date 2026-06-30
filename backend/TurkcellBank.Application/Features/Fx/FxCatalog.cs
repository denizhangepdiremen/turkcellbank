using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Fx;

/// <summary>
/// Döviz/altın modülü sabitleri ve para birimi meta verisi.
/// </summary>
public static class FxCatalog
{
    /// <summary>Bir işlemin asgari TL karşılığı (çok küçük bozuk işlemleri engeller).</summary>
    public const decimal MinTradeTry = 100m;

    /// <summary>Jitter bandı: güncel kur referans ortalamanın ±%3'ünde dolaşır.</summary>
    public const decimal JitterBand = 0.03m;

    /// <summary>Her tıkta uygulanan azami rastgele adım (±%0,3).</summary>
    public const decimal JitterStep = 0.003m;

    /// <summary>Yarı spread (referans ortalamaya oran): toplam alış-satış farkı ~%0,4.</summary>
    public const decimal HalfSpread = 0.002m;

    public record CurrencyInfo(Currency Currency, string Code, string Name, string Unit);

    // TRY dışı işlem görülebilen birimler (seed + ekran için).
    public static readonly IReadOnlyList<CurrencyInfo> Tradable = new[]
    {
        new CurrencyInfo(Currency.USD, "USD", "ABD Doları", "$"),
        new CurrencyInfo(Currency.EUR, "EUR", "Euro", "€"),
        new CurrencyInfo(Currency.XAU, "XAU", "Gram Altın", "gr"),
    };

    public static bool IsTradable(Currency c) => c != Currency.TRY;
}
