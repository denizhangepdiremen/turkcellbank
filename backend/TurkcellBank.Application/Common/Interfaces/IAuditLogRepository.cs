using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Denetim kaydı veri erişimi.</summary>
public interface IAuditLogRepository
{
    Task AddAsync(AuditLog log);

    // Son kayıtlar (aktör bilgisiyle), yeniden eskiye.
    Task<List<AuditLog>> GetRecentAsync(int take);
}
