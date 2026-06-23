using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Audit.Dtos;

namespace TurkcellBank.Application.Features.Audit;

public class AuditService : IAuditService
{
    private readonly IAuditLogRepository _repo;

    public AuditService(IAuditLogRepository repo)
    {
        _repo = repo;
    }

    public async Task<List<AuditLogDto>> GetRecentAsync(int take = 100)
    {
        var logs = await _repo.GetRecentAsync(take);
        return logs.Select(l => new AuditLogDto(
            l.Id,
            l.Actor?.FullName ?? "—",
            l.ActorRole,
            l.Action,
            l.Detail,
            l.CreatedAt)).ToList();
    }
}
