namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Banka şubesi. Personel (şube çalışanı/şube müdürü) bir şubeye bağlıdır.
/// Şube bir ile (City) aittir; il müdürü görünürlüğü il üzerinden kurulur.
/// </summary>
public class Branch
{
    public Guid Id { get; set; }

    // Şube kodu (ör. "SB001"). Sistemde benzersizdir.
    public string Code { get; set; } = string.Empty;

    // Şube adı (ör. "İstanbul Kadıköy Şubesi").
    public string Name { get; set; } = string.Empty;

    // İl (ör. "İstanbul"). İl müdürü kapsamı bu alan üzerinden belirlenir.
    public string City { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // İlişki: bir şubede birden çok personel çalışır.
    public ICollection<User> Staff { get; set; } = new List<User>();
}
