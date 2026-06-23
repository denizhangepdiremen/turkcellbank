namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Müşteriye düşen bildirim (kredi/havale/kart kararı vb.). Bir yetkili karar
/// verdiğinde ilgili müşteriye yazılır; müşteri panelinde okunur.
/// </summary>
public class Notification
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; } // bildirimin sahibi (müşteri)

    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
