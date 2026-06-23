using TurkcellBank.Application.Features.Audit.Dtos;

namespace TurkcellBank.Application.Features.Audit;

/// <summary>Denetim kaydı okuma (admin/direktör görünümü).</summary>
public interface IAuditService
{
    Task<List<AuditLogDto>> GetRecentAsync(int take = 100);
}
