using TurkcellBank.Application.Features.PaymentOrders;

namespace TurkcellBank.API.Services;

/// <summary>
/// Düzenli ödeme talimatlarını periyodik olarak çalıştıran arka plan servisi.
/// Her tıkta yeni bir DI scope açar (DbContext/repository scoped olduğu için),
/// vadesi gelmiş talimatları <see cref="IPaymentOrderExecutor"/> ile işler.
///
/// Tık aralığı config'ten okunur (PaymentOrders:IntervalSeconds, varsayılan 60sn).
/// Bir tıkta hata olsa bile servis ayakta kalır (tek talimat hatası batch'i bozmaz,
/// genel hata da loglanıp bir sonraki tıkta tekrar denenir).
/// </summary>
public class PaymentOrderWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<PaymentOrderWorker> _logger;

    public PaymentOrderWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<PaymentOrderWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalSeconds = _config.GetValue<int?>("PaymentOrders:IntervalSeconds") ?? 60;
        var interval = TimeSpan.FromSeconds(Math.Max(10, intervalSeconds));

        // Uygulama tam ayağa kalksın diye ilk tıktan önce kısa bekleme
        try { await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var executor = scope.ServiceProvider.GetRequiredService<IPaymentOrderExecutor>();
                var processed = await executor.ExecuteDueAsync(DateTime.UtcNow, stoppingToken);
                if (processed > 0)
                    _logger.LogInformation("Düzenli ödeme: {Count} talimat çalıştırıldı.", processed);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Düzenli ödeme talimatları çalıştırılırken hata oluştu.");
            }

            try { await Task.Delay(interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
