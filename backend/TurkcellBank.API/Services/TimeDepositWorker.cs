using TurkcellBank.Application.Features.TimeDeposits;

namespace TurkcellBank.API.Services;

/// <summary>
/// Vadesi dolmuş vadeli mevduatları periyodik işleyen arka plan servisi.
/// Her tıkta yeni bir DI scope açar; vadesi gelen mevduatların anapara + net
/// faizini kaynak hesaba <see cref="ITimeDepositMaturityProcessor"/> ile geri yatırır.
///
/// Tık aralığı düzenli ödeme talimatlarıyla aynı config'ten okunur
/// (PaymentOrders:IntervalSeconds, varsayılan 60sn).
/// </summary>
public class TimeDepositWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<TimeDepositWorker> _logger;

    public TimeDepositWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<TimeDepositWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalSeconds = _config.GetValue<int?>("PaymentOrders:IntervalSeconds") ?? 60;
        var interval = TimeSpan.FromSeconds(Math.Max(10, intervalSeconds));

        try { await Task.Delay(TimeSpan.FromSeconds(12), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var processor = scope.ServiceProvider.GetRequiredService<ITimeDepositMaturityProcessor>();
                var processed = await processor.ProcessMaturedAsync(DateTime.UtcNow, stoppingToken);
                if (processed > 0)
                    _logger.LogInformation("Vadeli mevduat: {Count} mevduat vadesi işlendi.", processed);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Vadeli mevduat vadeleri işlenirken hata oluştu.");
            }

            try { await Task.Delay(interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
