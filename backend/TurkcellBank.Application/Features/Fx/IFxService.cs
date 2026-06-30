using TurkcellBank.Application.Features.Fx.Dtos;

namespace TurkcellBank.Application.Features.Fx;

/// <summary>Döviz/altın alış-satış ve kur tahtası iş mantığı (istek bağlamında).</summary>
public interface IFxService
{
    /// <summary>Güncel kur tahtası (TRY dışı birimler).</summary>
    Task<List<ExchangeRateDto>> GetRatesAsync();

    /// <summary>Alış/satış öncesi anlık fiyat sorgusu (TL karşılığı + kur).</summary>
    Task<FxQuoteDto> GetQuoteAsync(FxQuoteRequest request);

    /// <summary>Döviz/altın al ya da sat. İki bacaklı, atomik para hareketi.</summary>
    Task<FxTradeDto> TradeAsync(FxTradeRequest request);

    /// <summary>Kullanıcının döviz/altın işlem geçmişi.</summary>
    Task<List<FxTradeDto>> GetMyTradesAsync();
}

/// <summary>
/// Kurları periyodik oynatan jitter servisi (arka plan; istek bağlamı yok).
/// </summary>
public interface IExchangeRateUpdater
{
    /// <summary>Tüm kurları referans ortalamanın etrafında küçük adımla günceller.</summary>
    Task<int> JitterAsync(CancellationToken ct = default);
}
