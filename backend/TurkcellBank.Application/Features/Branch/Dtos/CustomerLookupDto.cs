using TurkcellBank.Application.Features.Accounts.Dtos;

namespace TurkcellBank.Application.Features.Branch.Dtos;

/// <summary>
/// Şube çalışanının müşteri aramasında dönen özet: müşteri kimliği + hesapları.
/// Çalışan, bu bilgilerle müşteri adına işlem (hesap/havale/kredi/kart) yapar.
/// </summary>
public record CustomerLookupDto(
    Guid Id,
    string FullName,
    string Email,
    string? NationalId,
    List<AccountDto> Accounts);
