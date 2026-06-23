using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Accounts;
using TurkcellBank.Application.Features.Accounts.Dtos;
using TurkcellBank.Application.Features.Branch.Dtos;
using TurkcellBank.Application.Features.Cards;
using TurkcellBank.Application.Features.Cards.Dtos;
using TurkcellBank.Application.Features.Loans;
using TurkcellBank.Application.Features.Loans.Dtos;
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

        // Müşteri adına bağlamı ayarla ve hesaplarını getir
        ActOnBehalfOf(user);
        var accounts = await _accountService.GetMyAccountsAsync();

        return new CustomerLookupDto(user.Id, user.FullName, user.Email, user.NationalId, accounts);
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
}
