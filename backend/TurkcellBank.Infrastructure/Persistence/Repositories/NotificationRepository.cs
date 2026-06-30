using Microsoft.EntityFrameworkCore;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Infrastructure.Persistence.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly AppDbContext _db;

    public NotificationRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(Notification notification)
    {
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();
    }

    public Task<List<Notification>> GetByUserIdAsync(Guid userId)
        => _db.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

    public async Task MarkOneReadAsync(Guid userId, Guid notificationId)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.UserId == userId && n.Id == notificationId);

        if (notification is null || notification.IsRead) return;

        notification.IsRead = true;
        await _db.SaveChangesAsync();
    }

    public async Task MarkAllReadAsync(Guid userId)
    {
        var unread = await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();
        foreach (var n in unread) n.IsRead = true;
        await _db.SaveChangesAsync();
    }
}
