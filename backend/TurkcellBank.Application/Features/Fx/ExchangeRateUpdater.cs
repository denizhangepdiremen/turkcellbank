using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Notifications;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Fx;

/// <summary>
/// Kurları "canlı" göstermek için periyodik olarak küçük adımlarla oynatır.
/// Güncel ortalama, referans ortalamanın (<c>BaseMid</c>) ±%3 bandında dolaşır;
/// alış/satış bu ortalamanın etrafına sabit spread ile yerleştirilir.
/// İstek bağlamı yoktur (arka plan servisinden çağrılır).
/// </summary>
public class ExchangeRateUpdater : IExchangeRateUpdater
{
    private readonly IExchangeRateRepository _rates;
    private readonly IFxRateAlertRepository _alerts;
    private readonly INotificationService _notifications;

    public ExchangeRateUpdater(
        IExchangeRateRepository rates,
        IFxRateAlertRepository alerts,
        INotificationService notifications)
    {
        _rates = rates;
        _alerts = alerts;
        _notifications = notifications;
    }

    public async Task<int> JitterAsync(CancellationToken ct = default)
    {
        var rates = await _rates.GetAllAsync();
        if (rates.Count == 0) return 0;

        var now = DateTime.UtcNow;
        foreach (var rate in rates)
        {
            if (ct.IsCancellationRequested) break;

            var currentMid = (rate.BuyRate + rate.SellRate) / 2m;

            // ±JitterStep (örn. ±%0,3) rastgele adım
            var step = ((decimal)Random.Shared.NextDouble() * 2m - 1m) * FxCatalog.JitterStep;
            var newMid = currentMid * (1m + step);

            // Referans ortalamanın ±JitterBand bandına sıkıştır
            var lower = rate.BaseMid * (1m - FxCatalog.JitterBand);
            var upper = rate.BaseMid * (1m + FxCatalog.JitterBand);
            newMid = Math.Clamp(newMid, lower, upper);

            var spread = rate.BaseMid * FxCatalog.HalfSpread;
            rate.BuyRate = Math.Round(newMid - spread, 4, MidpointRounding.AwayFromZero);
            rate.SellRate = Math.Round(newMid + spread, 4, MidpointRounding.AwayFromZero);
            rate.UpdatedAt = now;
        }

        await _rates.SaveChangesAsync();
        await TriggerRateAlertsAsync(rates, now, ct);
        return rates.Count;
    }

    private async Task TriggerRateAlertsAsync(
        IReadOnlyCollection<ExchangeRate> rates,
        DateTime now,
        CancellationToken ct)
    {
        var byCurrency = rates.ToDictionary(r => r.Currency);
        var alerts = await _alerts.GetActiveAsync();

        foreach (var alert in alerts)
        {
            if (ct.IsCancellationRequested) break;
            if (!byCurrency.TryGetValue(alert.Currency, out var rate)) continue;

            var current = Math.Round((rate.BuyRate + rate.SellRate) / 2m, 4, MidpointRounding.AwayFromZero);
            alert.LastCheckedRate = current;

            var triggered = alert.Direction == FxAlertDirection.Above
                ? current >= alert.TargetRate
                : current <= alert.TargetRate;

            if (!triggered) continue;

            alert.IsTriggered = true;
            alert.IsActive = false;
            alert.TriggeredAt = now;

            var code = FxCatalog.Tradable.FirstOrDefault(c => c.Currency == alert.Currency)?.Code
                ?? alert.Currency.ToString();
            var direction = alert.Direction == FxAlertDirection.Above ? "üstüne çıktı" : "altına indi";
            await _notifications.NotifyAsync(
                alert.UserId,
                "Kur alarmı gerçekleşti",
                $"{code} kuru {alert.TargetRate:N4} hedefinin {direction}. Güncel ortalama kur: {current:N4} TL.");
        }

        await _alerts.SaveChangesAsync();
    }
}
