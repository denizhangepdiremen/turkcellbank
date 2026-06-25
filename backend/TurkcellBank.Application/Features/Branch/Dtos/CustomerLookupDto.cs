using TurkcellBank.Application.Features.Accounts.Dtos;
using TurkcellBank.Application.Features.Cards.Dtos;
using TurkcellBank.Application.Features.Loans.Dtos;
using TurkcellBank.Application.Features.Transactions.Dtos;

namespace TurkcellBank.Application.Features.Branch.Dtos;

/// <summary>
/// Personelin müşteri aramasında dönen 360 özet: müşteri kimliği, hesaplar,
/// kartlar, krediler ve son işlemler.
/// </summary>
public record CustomerLookupDto(
    Guid Id,
    string FullName,
    string Email,
    string? NationalId,
    List<AccountDto> Accounts,
    List<AdminCardDto> Cards,
    List<LoanDto> Loans,
    List<TransactionDto> RecentTransactions);
