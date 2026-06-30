using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Kur alarmı veri erişimi.</summary>
public interface IFxRateAlertRepository
{
    Task AddAsync(FxRateAlert alert);
    Task<List<FxRateAlert>> GetByUserIdAsync(Guid userId);
    Task<List<FxRateAlert>> GetActiveAsync();
    Task<FxRateAlert?> GetByIdAsync(Guid id);
    Task SaveChangesAsync();
}
