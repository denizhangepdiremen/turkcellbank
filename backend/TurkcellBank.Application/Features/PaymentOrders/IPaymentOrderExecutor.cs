namespace TurkcellBank.Application.Features.PaymentOrders;

/// <summary>
/// Vadesi gelmiş düzenli ödeme talimatlarını çalıştıran sistem servisi.
/// Arka plandaki bir BackgroundService tarafından periyodik çağrılır; istek
/// bağlamına (oturum açmış kullanıcı) bağlı DEĞİLDİR.
/// </summary>
public interface IPaymentOrderExecutor
{
    /// <summary>Vadesi gelmiş aktif talimatları çalıştırır. İşlenen talimat sayısını döner.</summary>
    Task<int> ExecuteDueAsync(DateTime nowUtc, CancellationToken ct = default);
}
