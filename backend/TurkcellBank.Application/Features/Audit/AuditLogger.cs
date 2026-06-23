using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Features.Audit;

/// <summary>
/// IAuditLogger uygulaması: aktörü (kim) ve rolü mevcut kullanıcıdan alıp
/// denetim kaydı yazar. Servisler önemli aksiyonlarda çağırır.
/// </summary>
public class AuditLogger : IAuditLogger
{
    private readonly IAuditLogRepository _repo;
    private readonly ICurrentUserService _currentUser;

    public AuditLogger(IAuditLogRepository repo, ICurrentUserService currentUser)
    {
        _repo = repo;
        _currentUser = currentUser;
    }

    public Task LogAsync(string action, string detail)
        => _repo.AddAsync(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = _currentUser.UserId,
            ActorRole = _currentUser.Role ?? string.Empty,
            Action = action,
            Detail = detail,
            CreatedAt = DateTime.UtcNow,
        });
}
