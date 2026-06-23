using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Domain.Entities;

/// <summary>
/// Kullanıcı (müşteri veya admin). Sisteme kayıt olan kişi.
/// </summary>
public class User
{
    public Guid Id { get; set; }

    public string FullName { get; set; } = string.Empty;

    // Giriş için kullanılır; sistemde benzersiz (unique) olacak.
    public string Email { get; set; } = string.Empty;

    // BCrypt ile hash'lenmiş şifre — asla düz metin saklanmaz.
    public string PasswordHash { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.Customer;

    // TC kimlik no (11 hane). Kredi başvurusunda alınır; bir kez kaydedilip
    // sonraki başvurularda tekrar kullanılır. Kayıt anında boş olabilir.
    public string? NationalId { get; set; }

    // --- Personel alanları (sadece banka çalışanları için doldurulur) ---
    // Müşteri ve admin için bunlar boştur. Personel bankacılık ürünü tutmaz.

    // Bağlı şube (ŞubeÇalışanı/ŞubeMüdürü için). İl müdürü/direktör için boştur.
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }

    // Personelin görev ili (ŞubeÇalışanı/ŞubeMüdürü/İlMüdürü için doldurulur).
    // İl müdürü görünürlüğü ve raporlamada bu alan kullanılır.
    public string? City { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // İlişki: bir kullanıcının birden çok hesabı olabilir.
    public ICollection<Account> Accounts { get; set; } = new List<Account>();
}
