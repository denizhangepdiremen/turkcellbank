using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Sanal POS ödeme veri erişimi.</summary>
public interface IPaymentRepository
{
    Task AddAsync(Payment payment);

    // Kullanıcının ödeme geçmişi (yeniden eskiye)
    Task<List<Payment>> GetByUserIdAsync(Guid userId);

    Task<Payment?> GetByIdAsync(Guid id);

    // Bu kartla (fingerprint) kaç başarısız işlem var? (fraud kontrolü)
    Task<int> CountFailedByFingerprintAsync(string fingerprint);

    // Tüm ödemeler, ödeyenle (admin)
    Task<List<Payment>> GetAllWithUserAsync();

    Task SaveChangesAsync();
}
