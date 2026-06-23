using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Kredi başvurusu veri erişimi.</summary>
public interface ILoanRepository
{
    Task AddAsync(LoanApplication loan);

    // Bir kullanıcının başvuruları (yeniden eskiye)
    Task<List<LoanApplication>> GetByUserIdAsync(Guid userId);

    // Tek başvuru (id ile). Yoksa null.
    Task<LoanApplication?> GetByIdAsync(Guid id);

    // Tüm başvurular, başvuran bilgisiyle (admin için)
    Task<List<LoanApplication>> GetAllWithUserAsync();

    // Belirli durumdaki başvurular, başvuranla (yetkili onay kuyruğu için)
    Task<List<LoanApplication>> GetByStatusWithUserAsync(LoanStatus status);

    // Karar (onay/red) sonrası kaydet
    Task SaveChangesAsync();
}
