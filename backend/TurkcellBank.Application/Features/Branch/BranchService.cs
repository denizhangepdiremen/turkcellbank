using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Accounts;
using TurkcellBank.Application.Features.Accounts.Dtos;
using TurkcellBank.Application.Features.Branch.Dtos;
using TurkcellBank.Application.Features.Cards;
using TurkcellBank.Application.Features.Cards.Dtos;
using TurkcellBank.Application.Features.Loans;
using TurkcellBank.Application.Features.Loans.Dtos;
using TurkcellBank.Application.Features.Payments;
using TurkcellBank.Application.Features.Transactions;
using TurkcellBank.Application.Features.Transactions.Dtos;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Branch;

/// <summary>
/// Şube çalışanı orkestrasyonu: hedef müşteriyi doğrular, işlem bağlamını ona
/// yönlendirir (ActOnBehalfOf) ve mevcut servisleri çağırır. Böylece iş mantığı
/// (IBAN üretimi, bakiye kontrolü, kredi AI değerlendirmesi vb.) tekrar yazılmaz.
/// </summary>
public class BranchService : IBranchService
{
    private readonly IUserRepository _users;
    private readonly IAccountRepository _accounts;
    private readonly ICardRepository _cards;
    private readonly ILoanRepository _loans;
    private readonly ITransactionRepository _transactions;
    private readonly ICurrentUserService _currentUser;   // giriş yapan şube çalışanı
    private readonly IOperationContext _ctx;
    private readonly IAccountService _accountService;
    private readonly ITransactionService _transactionService;
    private readonly ITransferApprovalService _transferApproval;
    private readonly ICardService _cardService;
    private readonly ILoanService _loanService;
    private readonly TransferOptions _transferOptions;
    private readonly IAuditLogger _audit;

    public BranchService(
        IUserRepository users,
        IAccountRepository accounts,
        ICardRepository cards,
        ILoanRepository loans,
        ITransactionRepository transactions,
        ICurrentUserService currentUser,
        IOperationContext ctx,
        IAccountService accountService,
        ITransactionService transactionService,
        ITransferApprovalService transferApproval,
        ICardService cardService,
        ILoanService loanService,
        TransferOptions transferOptions,
        IAuditLogger audit)
    {
        _users = users;
        _accounts = accounts;
        _cards = cards;
        _loans = loans;
        _transactions = transactions;
        _currentUser = currentUser;
        _ctx = ctx;
        _accountService = accountService;
        _transactionService = transactionService;
        _transferApproval = transferApproval;
        _cardService = cardService;
        _loanService = loanService;
        _transferOptions = transferOptions;
        _audit = audit;
    }

    public async Task<CustomerLookupDto> SearchCustomerAsync(string query)
    {
        var q = (query ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(q))
            throw new BusinessException("Arama için TC kimlik no veya e-posta girin.");

        // 11 hane ise TC; değilse e-posta ile ara
        var user = q.Length == 11 && q.All(char.IsDigit)
            ? await _users.GetByNationalIdAsync(q)
            : await _users.GetByEmailAsync(q.ToLowerInvariant());

        if (user is null || user.Role != UserRole.Customer)
            throw new NotFoundException("Müşteri bulunamadı.");

        var accounts = (await _accounts.GetByUserIdAsync(user.Id))
            .Where(a => a.IsActive)
            .ToList();
        var accountDtos = accounts.Select(MapAccount).ToList();
        var cards = await GetCustomerCardsAsync(user);
        var loans = await GetCustomerLoansAsync(user.Id);
        var transactions = await GetRecentTransactionsAsync(accounts);

        return new CustomerLookupDto(user.Id, user.FullName, user.Email, user.NationalId,
            accountDtos, cards, loans, transactions);
    }

    public async Task<AccountDto> OpenAccountAsync(Guid customerId, CreateAccountRequest request)
    {
        await ImpersonateAsync(customerId);
        var account = await _accountService.OpenAccountAsync(request);
        await _audit.LogAsync("Şube: hesap açma", $"Müşteri adına {request.AccountType} hesap açıldı.");
        return account;
    }

    public async Task<TransactionDto> DepositAsync(Guid customerId, DepositRequest request)
    {
        await ImpersonateAsync(customerId);
        var tx = await _transactionService.DepositAsync(request);
        await _audit.LogAsync("Şube: para yatırma", $"Müşteri adına {request.Amount:N0} TL yatırıldı.");
        return tx;
    }

    public async Task<BranchTransferResultDto> TransferAsync(Guid customerId, TransferRequest request)
    {
        await ImpersonateAsync(customerId);

        // Yüksek tutar (eşik üstü) hemen gerçekleşmez; şube müdürü onayına gider.
        if (request.Amount > _transferOptions.BranchManagerApprovalLimit)
        {
            await _transferApproval.CreatePendingAsync(request);
            await _audit.LogAsync("Şube: yüksek havale",
                $"Müşteri adına {request.Amount:N0} TL havale şube müdürü onayına gönderildi.");
            return new BranchTransferResultDto("PendingApproval", request.Amount);
        }

        await _transactionService.TransferAsync(request);
        await _audit.LogAsync("Şube: havale", $"Müşteri adına {request.Amount:N0} TL havale yapıldı.");
        return new BranchTransferResultDto("Completed", request.Amount);
    }

    public async Task<CardDto> ApplyCardAsync(Guid customerId, CreateCardRequest request)
    {
        await ImpersonateAsync(customerId);
        var card = await _cardService.CreateAsync(request);
        await _audit.LogAsync("Şube: kart başvurusu", "Müşteri adına kart başvurusu yapıldı.");
        return card;
    }

    public async Task<LoanDto> ApplyLoanAsync(Guid customerId, LoanApplicationRequest request)
    {
        await ImpersonateAsync(customerId);
        var loan = await _loanService.ApplyAsync(request);
        await _audit.LogAsync("Şube: kredi başvurusu", $"Müşteri adına {request.Amount:N0} TL kredi başvurusu yapıldı.");
        return loan;
    }

    // Hedef müşteriyi doğrula ve işlem bağlamını ona yönlendir.
    private async Task ImpersonateAsync(Guid customerId)
    {
        var customer = await _users.GetByIdAsync(customerId);
        if (customer is null || customer.Role != UserRole.Customer)
            throw new NotFoundException("Müşteri bulunamadı.");
        ActOnBehalfOf(customer);
    }

    private void ActOnBehalfOf(User customer) =>
        _ctx.ActOnBehalfOf(customer.Id, _currentUser.UserId);

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

    private static AccountDto MapAccount(Account a) =>
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
        var accountIban = isOutgoing ? t.FromIban : t.ToIban;
        return new TransactionDto(
            t.Id, t.Type.ToString(), direction, t.Amount, counterparty, accountIban, t.Description, t.Channel.ToString(), t.CreatedAt);
    }
}
