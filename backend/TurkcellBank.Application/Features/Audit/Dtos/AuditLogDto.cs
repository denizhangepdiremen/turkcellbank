namespace TurkcellBank.Application.Features.Audit.Dtos;

/// <summary>Denetim kaydı görüntüleme satırı (admin/direktör).</summary>
public record AuditLogDto(
    Guid Id,
    string ActorName,
    string ActorRole,
    string Action,
    string Detail,
    DateTime CreatedAt);
