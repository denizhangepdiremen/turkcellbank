using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Accounts.Dtos;

/// <summary>Hesap açma isteği — sadece hesap tipi seçilir (IBAN otomatik üretilir).</summary>
public record CreateAccountRequest(AccountType AccountType);
