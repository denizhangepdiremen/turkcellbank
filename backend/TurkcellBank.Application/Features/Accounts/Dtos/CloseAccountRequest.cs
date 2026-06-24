namespace TurkcellBank.Application.Features.Accounts.Dtos;

/// <summary>
/// Hesap kapatma isteği. Hesapta bakiye varsa, bakiyenin aktarılacağı hedef
/// hesabın id'si zorunludur (müşterinin başka bir aktif hesabı). Bakiye 0 ise
/// hedef gerekmez. Kapatınca hesaba bağlı kartlar da silinir.
/// </summary>
public record CloseAccountRequest(Guid? TargetAccountId);
