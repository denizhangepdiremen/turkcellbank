using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Düzenli ödeme talimatı veri erişimi.</summary>
public interface IPaymentOrderRepository
{
    Task AddAsync(PaymentOrder order);

    /// <summary>Kullanıcının talimatları (yeniden eskiye).</summary>
    Task<List<PaymentOrder>> GetByUserIdAsync(Guid userId);

    /// <summary>Tek talimat (id ile). Yoksa null.</summary>
    Task<PaymentOrder?> GetByIdAsync(Guid id);

    /// <summary>Vadesi gelmiş ve aktif talimatlar (arka plan çalıştırıcı için).</summary>
    Task<List<PaymentOrder>> GetDueAsync(DateTime nowUtc);

    Task DeleteAsync(PaymentOrder order);

    /// <summary>İzlenen değişiklikleri kaydet (aktif/pasif, sonraki çalışma vb.).</summary>
    Task SaveChangesAsync();
}
