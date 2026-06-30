using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Müşteri bildirimleri veri erişimi.</summary>
public interface INotificationRepository
{
    Task AddAsync(Notification notification);
    Task<List<Notification>> GetByUserIdAsync(Guid userId);
    Task MarkOneReadAsync(Guid userId, Guid notificationId);
    Task MarkAllReadAsync(Guid userId);
}
