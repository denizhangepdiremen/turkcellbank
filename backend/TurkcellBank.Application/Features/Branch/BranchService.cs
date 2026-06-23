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
    private readonly ICardService _cardService;
    private readonly ILoanService _loanService;

    public BranchService(
        IUserRepository users,
        ICurrentUserService currentUser,
        IOperationContext ctx,
        IAccountService accountService,
        ITransactionService transactionService,
        ICardService cardService,
        ILoanService loanService)
    {
        _users = users;
        _currentUser = currentUser;
        _ctx = ctx;
        _accountService = accountService;
        _transactionService = transactionService;
        _cardService = cardService;
        _loanService = loanService;
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
        return await _accountService.OpenAccountAsync(request);
    }

    public async Task<TransactionDto> DepositAsync(Guid customerId, DepositRequest request)
    {
        await ImpersonateAsync(customerId);
        return await _transactionService.DepositAsync(request);
    }

    public async Task<TransactionDto> TransferAsync(Guid customerId, TransferRequest request)
    {
        await ImpersonateAsync(customerId);
        return await _transactionService.TransferAsync(request);
    }

    public async Task<CardDto> ApplyCardAsync(Guid customerId, CreateCardRequest request)
    {
        await ImpersonateAsync(customerId);
        return await _cardService.CreateAsync(request);
    }

    public async Task<LoanDto> ApplyLoanAsync(Guid customerId, LoanApplicationRequest request)
    {
        await ImpersonateAsync(customerId);
        return await _loanService.ApplyAsync(request);
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
