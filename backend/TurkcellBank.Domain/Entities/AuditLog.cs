namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Denetim kaydı: kim, ne zaman, hangi işlemi yaptı. Önemli aksiyonlar
/// (onay/red kararları, şube adına işlemler, yüksek havaleler) buraya yazılır
/// ve admin/direktör tarafından görüntülenir.
/// </summary>
public class AuditLog
{
    public Guid Id { get; set; }

    public Guid ActorUserId { get; set; } // işlemi yapan kullanıcı
    public User? Actor { get; set; }
    public string ActorRole { get; set; } = string.Empty;

    public string Action { get; set; } = string.Empty; // kısa etiket (ör. "Kredi onayı")
    public string Detail { get; set; } = string.Empty;  // insan-okur açıklama

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
