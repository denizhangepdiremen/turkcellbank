using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Sanal POS ödeme veri erişimi.</summary>
public interface IPaymentRepository
{
    // Tek başına kaydet (örn. başarısız ödeme kaydı)
    Task AddAsync(Payment payment);

    // Context'e ekle (kaydetme) — bakiye/işlem ile aynı SaveChanges'te atomik yazmak için
    void Add(Payment payment);

    Task<List<Payment>> GetByUserIdAsync(Guid userId);
    Task<Payment?> GetByIdAsync(Guid id);

    // Tüm ödemeler, ödeyenle (admin)
    Task<List<Payment>> GetAllWithUserAsync();
}
