using TurkcellBank.Application.Features.Accounts.Dtos;

namespace TurkcellBank.Application.Features.Accounts;

/// <summary>Hesap işlemleri iş mantığı arayüzü.</summary>
public interface IAccountService
{
    Task<AccountDto> OpenAccountAsync(CreateAccountRequest request);
    Task<List<AccountDto>> GetMyAccountsAsync();
    Task<AccountDto> CloseAccountAsync(Guid accountId);
}
