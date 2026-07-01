using TurkcellBank.Application.Features.CreditCards;

namespace TurkcellBank.API.Services;

/// <summary>
/// Kredi kartı ekstre kesimi arka plan servisi. Periyodik olarak kesim günü gelen
/// kartları tarar ve <see cref="ICreditCardStatementProcessor"/> ile dönem ekstresini
/// keser (faturalama + asgari ödeme + son ödeme tarihi + bildirim).
///
/// Tık aralığı config'ten okunur (CreditCard:StatementIntervalSeconds, varsayılan 30sn).
/// </summary>
public class CreditCardStatementWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<CreditCardStatementWorker> _logger;

    public CreditCardStatementWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<CreditCardStatementWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalSeconds = _config.GetValue<int?>("CreditCard:StatementIntervalSeconds") ?? 30;
        var interval = TimeSpan.FromSeconds(Math.Max(10, intervalSeconds));

        try { await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var processor = scope.ServiceProvider.GetRequiredService<ICreditCardStatementProcessor>();
                var cut = await processor.ProcessDueAsync(DateTime.UtcNow, stoppingToken);
                if (cut > 0)
                    _logger.LogInformation("Kredi kartı ekstre kesimi: {Count} ekstre oluşturuldu.", cut);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Kredi kartı ekstre kesimi sırasında hata oluştu.");
            }

            try { await Task.Delay(interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
