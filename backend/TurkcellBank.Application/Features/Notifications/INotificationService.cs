using TurkcellBank.Application.Features.Notifications.Dtos;

namespace TurkcellBank.Application.Features.Notifications;

/// <summary>
/// Müşteri bildirimleri. <see cref="NotifyAsync"/> servisler tarafından (yetkili
/// karar verince) ilgili müşteriye bildirim yazmak için çağrılır; diğerleri
/// müşterinin kendi bildirimleri içindir.
/// </summary>
public interface INotificationService
{
    Task NotifyAsync(Guid userId, string title, string body);
    Task<List<NotificationDto>> GetMineAsync();
    Task MarkOneReadAsync(Guid notificationId);
    Task MarkAllReadAsync();
}
