using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Fatura ödeme veri erişimi.</summary>
public interface IBillPaymentRepository
{
    /// <summary>
    /// Fatura ödemesini ekler ve kaydeder. Aynı DbContext'te izlenen hesap
    /// bakiyesi ve işlem (Transaction) kaydı bu tek SaveChanges ile ATOMİK yazılır.
    /// </summary>
    Task AddAsync(BillPayment payment);

    /// <summary>Kullanıcının fatura ödemeleri (yeniden eskiye).</summary>
    Task<List<BillPayment>> GetByUserIdAsync(Guid userId);

    /// <summary>Tüm fatura ödemeleri + ödeyen kullanıcı (admin görünümü).</summary>
    Task<List<BillPayment>> GetAllWithUserAsync();

    /// <summary>Bu (kurum + abone no + dönem) faturası daha önce ödenmiş mi?</summary>
    Task<bool> IsPaidAsync(string billerCode, string subscriberNo, string period);
}
