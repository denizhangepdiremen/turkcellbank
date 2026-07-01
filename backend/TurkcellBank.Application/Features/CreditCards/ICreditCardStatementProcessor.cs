namespace TurkcellBank.Application.Features.CreditCards;

/// <summary>
/// Ekstre kesimi işlemcisi (arka plan bağlamı — istek/kullanıcı bağlamı yoktur).
/// Kesim günü gelen kartlar için dönemi faturalar, ekstre oluşturur, bildirim yazar
/// ve bir sonraki kesim tarihini ileri alır. Worker'dan (<c>CreditCardStatementWorker</c>)
/// periyodik çağrılır.
/// </summary>
public interface ICreditCardStatementProcessor
{
    /// <summary>Kesimi gelen kartları işler; oluşturulan ekstre sayısını döner.</summary>
    Task<int> ProcessDueAsync(DateTime nowUtc, CancellationToken ct = default);
}
