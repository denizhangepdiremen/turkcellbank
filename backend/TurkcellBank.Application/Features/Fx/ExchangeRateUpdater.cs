using TurkcellBank.Application.Common.Interfaces;

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

    public ExchangeRateUpdater(IExchangeRateRepository rates)
    {
        _rates = rates;
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
        return rates.Count;
    }
}
