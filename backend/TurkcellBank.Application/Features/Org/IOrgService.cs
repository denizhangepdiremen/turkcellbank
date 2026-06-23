using TurkcellBank.Application.Features.Org.Dtos;

namespace TurkcellBank.Application.Features.Org;

/// <summary>
/// Yönetici organizasyon görünümü: herkes bir alt kademeyi ve genel durumu görür
/// (şube müdürü→çalışanlar, il müdürü→şube müdürleri, direktör→il müdürleri).
/// </summary>
public interface IOrgService
{
    Task<OrgViewDto> GetTeamAsync();
}
