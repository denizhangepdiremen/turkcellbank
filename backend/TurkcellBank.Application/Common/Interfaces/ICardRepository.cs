using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Banka kartı veri erişimi.</summary>
public interface ICardRepository
{
    Task AddAsync(Card card);

    // Kullanıcının kartları (bağlı hesapla)
    Task<List<Card>> GetByUserIdAsync(Guid userId);

    // Tek kart (bağlı hesapla). Yoksa null.
    Task<Card?> GetByIdAsync(Guid id);

    // Bu kart numarası zaten var mı? (benzersizlik)
    Task<bool> CardNumberExistsAsync(string cardNumber);

    // Tüm kartlar, sahip + hesapla (admin)
    Task<List<Card>> GetAllWithUserAsync();

    // Bir hesaba bağlı tüm kartlar (hesap dondurma/kapatmada kullanılır)
    Task<List<Card>> GetByAccountIdAsync(Guid accountId);

    // Kartları sil (hesap kapatılırken bağlı kartlar silinir).
    // Not: silme henüz kaydedilmez; çağıran taraf SaveChanges ile atomik kapatır.
    void RemoveRange(IEnumerable<Card> cards);

    // Karar (onay/red) sonrası kaydet
    Task SaveChangesAsync();
}
