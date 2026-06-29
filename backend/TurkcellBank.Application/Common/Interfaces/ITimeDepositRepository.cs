using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Vadeli mevduat veri erişimi.</summary>
public interface ITimeDepositRepository
{
    Task AddAsync(TimeDeposit deposit);

    /// <summary>Kullanıcının vadeli mevduatları (yeniden eskiye).</summary>
    Task<List<TimeDeposit>> GetByUserIdAsync(Guid userId);

    /// <summary>Tek mevduat (id ile). Yoksa null.</summary>
    Task<TimeDeposit?> GetByIdAsync(Guid id);

    /// <summary>Vadesi dolmuş aktif mevduatlar (arka plan çalıştırıcı için).</summary>
    Task<List<TimeDeposit>> GetMaturedActiveAsync(DateTime nowUtc);

    /// <summary>İzlenen değişiklikleri kaydet.</summary>
    Task SaveChangesAsync();
}
