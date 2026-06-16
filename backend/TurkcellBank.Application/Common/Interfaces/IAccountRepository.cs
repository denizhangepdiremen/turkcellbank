using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>
/// Hesap veri erişimi soyutlaması. Gerçek uygulaması Infrastructure'da.
/// </summary>
public interface IAccountRepository
{
    Task AddAsync(Account account);

    // Belirli bir kullanıcının tüm hesapları
    Task<List<Account>> GetByUserIdAsync(Guid userId);

    // Tek hesap (id ile). Yoksa null.
    Task<Account?> GetByIdAsync(Guid id);

    // Bu IBAN zaten var mı? (benzersizlik kontrolü için)
    Task<bool> IbanExistsAsync(string iban);

    // Takip edilen değişiklikleri kaydet (örn. hesap kapatma sonrası)
    Task SaveChangesAsync();
}
