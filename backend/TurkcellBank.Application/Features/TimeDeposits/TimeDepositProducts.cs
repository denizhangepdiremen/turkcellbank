namespace TurkcellBank.Application.Features.TimeDeposits;

/// <summary>Sunulan vadeli mevduat ürünü (vade + yıllık brüt faiz oranı).</summary>
public record TimeDepositProduct(int TermDays, decimal AnnualRate, string Label);

/// <summary>
/// Vadeli mevduat ürünleri ve faiz hesabı. Ürünler (vade + oran) sabit referans
/// veridir; ayrı tablo yerine kod içinde tutulur.
/// </summary>
public static class TimeDepositProducts
{
    /// <summary>En düşük anapara (TL).</summary>
    public const decimal MinPrincipal = 1000m;

    /// <summary>Stopaj (gelir vergisi) oranı — brüt faizden kesilir.</summary>
    public const decimal WithholdingRate = 0.075m; // %7,5

    public static readonly IReadOnlyList<TimeDepositProduct> All = new List<TimeDepositProduct>
    {
        new(32, 0.45m, "32 Gün"),
        new(92, 0.47m, "92 Gün"),
        new(180, 0.48m, "180 Gün"),
    };

    public static TimeDepositProduct? Find(int termDays) =>
        All.FirstOrDefault(p => p.TermDays == termDays);

    /// <summary>
    /// Basit faizle brüt/stopaj/net faizi hesaplar.
    /// brüt = anapara * yıllık oran * gün / 365.
    /// </summary>
    public static (decimal Gross, decimal Withholding, decimal Net) ComputeInterest(
        decimal principal, decimal annualRate, int termDays)
    {
        var gross = Math.Round(principal * annualRate * termDays / 365m, 2);
        var withholding = Math.Round(gross * WithholdingRate, 2);
        var net = gross - withholding;
        return (gross, withholding, net);
    }
}
