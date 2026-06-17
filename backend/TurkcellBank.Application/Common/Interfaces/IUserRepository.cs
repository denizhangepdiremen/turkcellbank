using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>
/// Kullanıcı veri erişimi için soyutlama (arayüz).
/// Application bu arayüze bağımlı; gerçek veritabanı işlemleri
/// Infrastructure'daki UserRepository'de yapılır.
/// </summary>
public interface IUserRepository
{
    // Bu e-posta sistemde kayıtlı mı?
    Task<bool> EmailExistsAsync(string email);

    // E-postaya göre kullanıcıyı getir (giriş için). Yoksa null döner.
    Task<User?> GetByEmailAsync(string email);

    // Id ile kullanıcıyı getir (profil için). Yoksa null döner.
    Task<User?> GetByIdAsync(Guid id);

    // Yeni kullanıcıyı kaydet (veritabanına yaz).
    Task AddAsync(User user);

    // Takip edilen değişiklikleri kaydet (örn. profil güncelleme).
    Task SaveChangesAsync();
}
