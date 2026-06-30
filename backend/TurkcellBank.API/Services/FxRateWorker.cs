using TurkcellBank.Application.Features.Fx;

namespace TurkcellBank.API.Services;

/// <summary>
/// Döviz/altın kurlarını "canlı" göstermek için periyodik oynatan arka plan servisi.
/// Her tıkta yeni bir DI scope açar ve <see cref="IExchangeRateUpdater"/> ile kurları
/// referans ortalamanın etrafında küçük adımlarla günceller.
///
/// Tık aralığı config'ten okunur (Fx:JitterIntervalSeconds, varsayılan 15sn).
/// </summary>
public class FxRateWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<FxRateWorker> _logger;

    public FxRateWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<FxRateWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalSeconds = _config.GetValue<int?>("Fx:JitterIntervalSeconds") ?? 15;
        var interval = TimeSpan.FromSeconds(Math.Max(5, intervalSeconds));

        try { await Task.Delay(TimeSpan.FromSeconds(8), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var updater = scope.ServiceProvider.GetRequiredService<IExchangeRateUpdater>();
                await updater.JitterAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Kur güncellemesi sırasında hata oluştu.");
            }

            try { await Task.Delay(interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
