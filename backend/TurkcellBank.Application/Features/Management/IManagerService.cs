using TurkcellBank.Application.Features.Accounts.Dtos;
using TurkcellBank.Application.Features.Branch.Dtos;
using TurkcellBank.Application.Features.Management.Dtos;

namespace TurkcellBank.Application.Features.Management;

/// <summary>
/// Yönetici (şube/il müdürü, direktör) müşteri hesabı işlemleri. Müdür bir
/// müşteriyi TC/e-posta ile bulur ve hesabına banka bloğu koyar/kaldırır.
/// Banka bloğunu müşteri kendisi kaldıramaz (yalnızca personel).
/// </summary>
public interface IManagerService
{
    Task<CustomerLookupDto> SearchCustomerAsync(string query);
    Task<AccountDto> BankFreezeAsync(Guid accountId, BankFreezeRequest request);
    Task<AccountDto> BankUnfreezeAsync(Guid accountId);
}
