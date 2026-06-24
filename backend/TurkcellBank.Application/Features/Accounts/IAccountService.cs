using TurkcellBank.Application.Features.Accounts.Dtos;

namespace TurkcellBank.Application.Features.Accounts;

/// <summary>Hesap işlemleri iş mantığı arayüzü.</summary>
public interface IAccountService
{
    Task<AccountDto> OpenAccountAsync(CreateAccountRequest request);
    Task<List<AccountDto>> GetMyAccountsAsync();

    // Hesabı kapat: bakiyeyi hedef hesaba aktar, bağlı kartları sil, hesabı pasifleştir.
    Task<AccountDto> CloseAccountAsync(Guid accountId, CloseAccountRequest request);

    // Hesabı dondur (deaktive): işlemleri durdur, bağlı kartları bloke et.
    Task<AccountDto> FreezeAccountAsync(Guid accountId);

    // Dondurulmuş hesabı yeniden aktifleştir: bloke kartları tekrar onaylıya çevir.
    Task<AccountDto> ReactivateAccountAsync(Guid accountId);
}
