using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Accounts.Dtos;

/// <summary>Dışarıya dönülen hesap bilgisi.</summary>
public record AccountDto(
    Guid Id,
    string Iban,
    AccountType AccountType,
    Currency Currency, // TRY / USD / EUR / XAU (gram altın)
    decimal Balance,
    bool IsActive,
    bool IsFrozen,
    string FreezeType, // None / Customer / Bank — banka bloğunu müşteri kaldıramaz
    DateTime CreatedAt);
