using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>İşlem (para hareketi) veri erişimi.</summary>
public interface ITransactionRepository
{
    /// <summary>
    /// İşlemi ekler ve kaydeder. Aynı DbContext'te o an izlenen (tracked)
    /// hesap bakiyesi değişiklikleri de bu tek SaveChanges ile birlikte,
    /// ATOMİK olarak kaydedilir (ya hepsi olur ya hiçbiri).
    /// </summary>
    Task AddAsync(Transaction transaction);

    /// <summary>Bir hesabın işlem geçmişi (gönderdiği + aldığı), yeniden eskiye.</summary>
    Task<List<Transaction>> GetByAccountIdAsync(Guid accountId);

    /// <summary>
    /// Verilen hesaplardan belirtilen andan beri yapılan INTERNET kanalı havalelerinin
    /// toplam tutarı (günlük havale limiti kontrolü için).
    /// </summary>
    Task<decimal> SumInternetTransfersAsync(IReadOnlyCollection<Guid> fromAccountIds, DateTime sinceUtc);
}
