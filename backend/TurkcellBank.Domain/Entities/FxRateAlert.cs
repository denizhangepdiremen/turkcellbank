using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Müşterinin kur hedefi alarmı. Arka plan kur güncellemesi hedefi yakaladığında
/// tek seferlik bildirim üretir ve alarmı pasifleştirir.
/// </summary>
public class FxRateAlert
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    public Currency Currency { get; set; }
    public FxAlertDirection Direction { get; set; }
    public decimal TargetRate { get; set; }
    public decimal? LastCheckedRate { get; set; }

    public bool IsActive { get; set; } = true;
    public bool IsTriggered { get; set; }
    public DateTime? TriggeredAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}
