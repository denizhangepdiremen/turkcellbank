using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Accounts.Dtos;
using TurkcellBank.Application.Features.Branch.Dtos;
using TurkcellBank.Application.Features.Cards.Dtos;
using TurkcellBank.Application.Features.Loans.Dtos;
using TurkcellBank.Application.Features.Management.Dtos;
using TurkcellBank.Application.Features.Notifications;
using TurkcellBank.Application.Features.Payments;
using TurkcellBank.Application.Features.Transactions.Dtos;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Management;

/// <summary>
/// Yönetici müşteri hesabı işlemleri (banka bloğu). Audit kaydı + müşteri
/// bildirimi yazar. Yetki kontrolü controller'da [Authorize(Roles=...)] ile.
/// </summary>
public class ManagerService : IManagerService
{
    private readonly IUserRepository _users;
    private readonly IAccountRepository _accounts;
    private readonly ICardRepository _cards;
    private readonly ILoanRepository _loans;
    private readonly ITransactionRepository _transactions;
    private readonly IAuditLogger _audit;
    private readonly INotificationService _notifications;

    public ManagerService(
        IUserRepository users,
        IAccountRepository accounts,
        ICardRepository cards,
        ILoanRepository loans,
        ITransactionRepository transactions,
        IAuditLogger audit,
        INotificationService notifications)
    {
        _users = users;
        _accounts = accounts;
        _cards = cards;
        _loans = loans;
        _transactions = transactions;
        _audit = audit;
        _notifications = notifications;
    }

    public async Task<CustomerLookupDto> SearchCustomerAsync(string query)
    {
        var q = (query ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(q))
            throw new BusinessException("Arama için TC kimlik no veya e-posta girin.");

        // 11 hane ise TC; değilse e-posta
        var user = q.Length == 11 && q.All(char.IsDigit)
            ? await _users.GetByNationalIdAsync(q)
            : await _users.GetByEmailAsync(q.ToLowerInvariant());

        if (user is null || user.Role != UserRole.Customer)
            throw new NotFoundException("Müşteri bulunamadı.");

        // Müşterinin (kapalı olmayan) hesapları
        var accounts = await _accounts.GetByUserIdAsync(user.Id);
        var activeAccounts = accounts.Where(a => a.IsActive).ToList();
        var dtos = activeAccounts.Select(Map).ToList();
        var cards = await GetCustomerCardsAsync(user);
        var loans = await GetCustomerLoansAsync(user.Id);
        var transactions = await GetRecentTransactionsAsync(activeAccounts);

        return new CustomerLookupDto(user.Id, user.FullName, user.Email, user.NationalId, dtos, cards, loans, transactions);
    }

    public async Task<AccountDto> BankFreezeAsync(Guid accountId, BankFreezeRequest request)
    {
        var account = await GetActiveAccountAsync(accountId);
        if (account.IsFrozen)
            throw new BusinessException("Hesap zaten dondurulmuş.");

        account.IsFrozen = true;
        account.FreezeType = FreezeType.Bank; // banka bloğu — müşteri kaldıramaz

        // Onaylı kartları bloke et (açılınca geri onaylıya döner)
        var cards = await _cards.GetByAccountIdAsync(account.Id);
        foreach (var card in cards.Where(c => c.Status == CardStatus.Approved))
            card.Status = CardStatus.Blocked;

        await _accounts.SaveChangesAsync();

        var reason = string.IsNullOrWhiteSpace(request.Reason) ? "" : $" Gerekçe: {request.Reason}";
        await _audit.LogAsync("Banka hesap dondurma",
            $"...{account.Iban[^4..]} numaralı hesap banka tarafından donduruldu.{reason}");
        await _notifications.NotifyAsync(account.UserId, "Hesabınız donduruldu",
            $"...{account.Iban[^4..]} numaralı hesabınız banka tarafından dondurulmuştur." +
            $"{reason} Detay için şubenize başvurun.");

        return Map(account);
    }

    public async Task<AccountDto> BankUnfreezeAsync(Guid accountId)
    {
        var account = await GetActiveAccountAsync(accountId);
        if (!account.IsFrozen)
            throw new BusinessException("Hesap zaten aktif.");

        account.IsFrozen = false;
        account.FreezeType = FreezeType.None;

        // Bloke kartları geri onaylıya çevir
        var cards = await _cards.GetByAccountIdAsync(account.Id);
        foreach (var card in cards.Where(c => c.Status == CardStatus.Blocked))
            card.Status = CardStatus.Approved;

        await _accounts.SaveChangesAsync();

        await _audit.LogAsync("Banka hesap aktifleştirme",
            $"...{account.Iban[^4..]} numaralı hesabın banka bloğu kaldırıldı.");
        await _notifications.NotifyAsync(account.UserId, "Hesabınız yeniden aktif",
            $"...{account.Iban[^4..]} numaralı hesabınızın blokesi kaldırıldı; tekrar kullanabilirsiniz.");

        return Map(account);
    }

    private async Task<Account> GetActiveAccountAsync(Guid accountId)
    {
        var account = await _accounts.GetByIdAsync(accountId)
            ?? throw new NotFoundException("Hesap bulunamadı.");
        if (!account.IsActive)
            throw new BusinessException("Kapalı hesap üzerinde işlem yapılamaz.");
        return account;
    }

    private async Task<List<AdminCardDto>> GetCustomerCardsAsync(User user)
    {
        var cards = await _cards.GetByUserIdAsync(user.Id);
        return cards.Select(c => new AdminCardDto(
            c.Id,
            user.FullName,
            user.Email,
            CardHelper.Mask(c.CardNumber),
            c.Account?.Iban ?? "—",
            c.Status.ToString(),
            c.CreatedAt,
            c.DecidedAt)).ToList();
    }

    private async Task<List<LoanDto>> GetCustomerLoansAsync(Guid userId)
    {
        var loans = await _loans.GetByUserIdAsync(userId);
        return loans.Select(MapLoan).ToList();
    }

    private async Task<List<TransactionDto>> GetRecentTransactionsAsync(List<Account> accounts)
    {
        var accountIds = accounts.Select(a => a.Id).ToHashSet();
        var transactions = new List<Transaction>();

        foreach (var account in accounts)
            transactions.AddRange(await _transactions.GetByAccountIdAsync(account.Id));

        return transactions
            .GroupBy(t => t.Id)
            .Select(g => g.First())
            .OrderByDescending(t => t.CreatedAt)
            .Take(8)
            .Select(t => MapTransaction(t, accountIds))
            .ToList();
    }

    private static AccountDto Map(Account a) =>
        new(a.Id, a.Iban, a.AccountType, a.Balance, a.IsActive, a.IsFrozen,
            a.FreezeType.ToString(), a.CreatedAt);

    private static LoanDto MapLoan(LoanApplication l) =>
        new(l.Id, l.Income, l.Profession, l.Amount, l.TermMonths, l.Status.ToString(),
            l.Score, l.MaxLimit, l.ExistingDebt, l.NetLimit, l.AiReason, l.DecidedBy,
            l.DecisionNote, l.MonthlyInstallment, l.RemainingDebt, l.InstallmentsPaid,
            l.CreatedAt, l.DecidedAt, null);

    private static TransactionDto MapTransaction(Transaction t, HashSet<Guid> accountIds)
    {
        var isOutgoing = t.FromAccountId.HasValue && accountIds.Contains(t.FromAccountId.Value);
        var direction = isOutgoing ? "Out" : "In";
        var counterparty = isOutgoing ? t.ToIban : t.FromIban;
        return new TransactionDto(
            t.Id, t.Type.ToString(), direction, t.Amount, counterparty, t.Description, t.Channel.ToString(), t.CreatedAt);
    }
}
