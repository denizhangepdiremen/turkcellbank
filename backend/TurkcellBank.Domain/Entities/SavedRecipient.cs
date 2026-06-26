namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Kullanıcının sık transfer yaptığı kayıtlı alıcı.
/// </summary>
public class SavedRecipient
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Iban { get; set; } = string.Empty;
    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
