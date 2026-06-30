using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Accounts.Dtos;

/// <summary>
/// Hesap açma isteği — hesap tipi + (opsiyonel) para birimi seçilir; IBAN otomatik
/// üretilir. Para birimi belirtilmezse TL hesabı açılır.
/// </summary>
public record CreateAccountRequest(AccountType AccountType, Currency Currency = Currency.TRY);
