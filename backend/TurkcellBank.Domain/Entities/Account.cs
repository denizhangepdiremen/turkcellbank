using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Banka hesabı. Her hesap bir kullanıcıya ait, benzersiz bir IBAN'ı vardır.
/// </summary>
public class Account
{
    public Guid Id { get; set; }

    // Sahibi (FK -> User)
    public Guid UserId { get; set; }

    // Benzersiz (unique), hesap açılırken otomatik üretilecek.
    public string Iban { get; set; } = string.Empty;

    public AccountType AccountType { get; set; }

    // Para alanı: decimal (kuruş hassasiyeti). Yeni hesap 0 bakiyeyle açılır.
    public decimal Balance { get; set; }

    // Hesap kapama için: kapalı hesaplar IsActive = false olur (silinmez).
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // İlişki: bu hesabın sahibi olan kullanıcı.
    public User? User { get; set; }
}
