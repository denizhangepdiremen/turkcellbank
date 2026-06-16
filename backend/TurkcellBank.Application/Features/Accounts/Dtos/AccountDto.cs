using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Accounts.Dtos;

/// <summary>Dışarıya dönülen hesap bilgisi.</summary>
public record AccountDto(
    Guid Id,
    string Iban,
    AccountType AccountType,
    decimal Balance,
    bool IsActive,
    DateTime CreatedAt);
