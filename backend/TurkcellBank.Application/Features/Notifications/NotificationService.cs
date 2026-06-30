using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Notifications.Dtos;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Features.Notifications;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _repo;
    private readonly ICurrentUserService _currentUser;

    public NotificationService(INotificationRepository repo, ICurrentUserService currentUser)
    {
        _repo = repo;
        _currentUser = currentUser;
    }

    public Task NotifyAsync(Guid userId, string title, string body)
        => _repo.AddAsync(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = title,
            Body = body,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
        });

    public async Task<List<NotificationDto>> GetMineAsync()
    {
        var list = await _repo.GetByUserIdAsync(_currentUser.UserId);
        return list.Select(n => new NotificationDto(n.Id, n.Title, n.Body, n.IsRead, n.CreatedAt)).ToList();
    }

    public Task MarkOneReadAsync(Guid notificationId)
        => _repo.MarkOneReadAsync(_currentUser.UserId, notificationId);

    public Task MarkAllReadAsync() => _repo.MarkAllReadAsync(_currentUser.UserId);
}
