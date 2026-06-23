using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Şube veri erişimi (organizasyon görünümü/raporlar için).</summary>
public interface IBranchRepository
{
    Task<List<Branch>> GetAllAsync();
}
