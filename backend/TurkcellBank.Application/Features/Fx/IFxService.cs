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

    /// <summary>Döviz/altın birimleri arasında çapraz dönüşüm yapar.</summary>
    Task<FxConversionDto> ConvertAsync(FxConversionRequest request);

    /// <summary>Kullanıcının döviz/altın işlem geçmişi.</summary>
    Task<List<FxTradeDto>> GetMyTradesAsync();

    /// <summary>Kullanıcının çapraz dönüşüm geçmişi.</summary>
    Task<List<FxConversionDto>> GetMyConversionsAsync();

    /// <summary>Kullanıcının kur alarmları.</summary>
    Task<List<FxRateAlertDto>> GetMyAlertsAsync();

    /// <summary>Yeni kur alarmı oluşturur.</summary>
    Task<FxRateAlertDto> CreateAlertAsync(CreateFxRateAlertRequest request);

    /// <summary>Kur alarmını siler.</summary>
    Task DeleteAlertAsync(Guid id);
}

/// <summary>
/// Kurları periyodik oynatan jitter servisi (arka plan; istek bağlamı yok).
/// </summary>
public interface IExchangeRateUpdater
{
    /// <summary>Tüm kurları referans ortalamanın etrafında küçük adımla günceller.</summary>
    Task<int> JitterAsync(CancellationToken ct = default);
}
