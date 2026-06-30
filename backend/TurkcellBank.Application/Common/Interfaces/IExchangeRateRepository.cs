using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Kur verisi erişimi.</summary>
public interface IExchangeRateRepository
{
    /// <summary>Tüm kurlar (izlenen — jitter servisi üzerinde değişiklik yapıp kaydeder).</summary>
    Task<List<ExchangeRate>> GetAllAsync();

    /// <summary>Tek bir para biriminin kuru. Yoksa null.</summary>
    Task<ExchangeRate?> GetByCurrencyAsync(Currency currency);

    Task AddAsync(ExchangeRate rate);

    /// <summary>İzlenen kur değişikliklerini kaydet.</summary>
    Task SaveChangesAsync();
}
