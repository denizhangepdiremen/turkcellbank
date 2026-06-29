namespace TurkcellBank.Application.Features.PaymentOrders;

/// <summary>
/// Talimat zamanlaması. Talimatlar aylıktır: her ayın <c>dayOfMonth</c> (1-28)
/// günü çalışır. Tarihler UTC gün başı (00:00) olarak tutulur.
/// </summary>
public static class PaymentOrderSchedule
{
    /// <summary>
    /// <paramref name="fromUtc"/> tarihinden itibaren (o gün dahil) <paramref name="dayOfMonth"/>
    /// gününe denk gelen en yakın tarihi döner. Bu ayki gün geçmişse gelecek aya geçer.
    /// </summary>
    public static DateTime NextRun(int dayOfMonth, DateTime fromUtc)
    {
        var from = fromUtc.Date;
        var candidate = new DateTime(from.Year, from.Month, dayOfMonth, 0, 0, 0, DateTimeKind.Utc);
        if (candidate < from)
            candidate = candidate.AddMonths(1);
        return candidate;
    }

    /// <summary>Bir çalıştırma sonrası bir sonraki ayın aynı gününe öteler.</summary>
    public static DateTime AfterRun(int dayOfMonth, DateTime ranAtUtc)
        => NextRun(dayOfMonth, ranAtUtc.Date.AddDays(1));
}
