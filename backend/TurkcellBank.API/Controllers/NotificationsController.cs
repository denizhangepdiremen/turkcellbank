using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Features.Notifications;
using TurkcellBank.Application.Features.Notifications.Dtos;

namespace TurkcellBank.API.Controllers;

/// <summary>Müşteri bildirimleri. Giriş yapan kullanıcının kendi bildirimleri.</summary>
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notifications;

    public NotificationsController(INotificationService notifications)
    {
        _notifications = notifications;
    }

    /// <summary>Bildirimlerim. GET /api/notifications</summary>
    [HttpGet]
    public async Task<IActionResult> Mine()
    {
        var list = await _notifications.GetMineAsync();
        return Ok(ApiResponse<List<NotificationDto>>.SuccessResponse(list));
    }

    /// <summary>Tümünü okundu işaretle. POST /api/notifications/read</summary>
    [HttpPost("read")]
    public async Task<IActionResult> MarkAllRead()
    {
        await _notifications.MarkAllReadAsync();
        return Ok(ApiResponse<string>.SuccessResponse("ok", "Bildirimler okundu."));
    }

    /// <summary>Tek bildirimi okundu işaretle. POST /api/notifications/{id}/read</summary>
    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkOneRead(Guid id)
    {
        await _notifications.MarkOneReadAsync(id);
        return Ok(ApiResponse<string>.SuccessResponse("ok", "Bildirim okundu."));
    }
}
