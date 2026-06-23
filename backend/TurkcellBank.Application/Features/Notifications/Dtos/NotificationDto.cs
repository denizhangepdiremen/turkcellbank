namespace TurkcellBank.Application.Features.Notifications.Dtos;

/// <summary>Müşteri bildirimi (panelde gösterilir).</summary>
public record NotificationDto(
    Guid Id,
    string Title,
    string Body,
    bool IsRead,
    DateTime CreatedAt);
