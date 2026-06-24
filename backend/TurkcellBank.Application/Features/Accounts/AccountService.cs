using FluentValidation;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Accounts.Dtos;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Accounts;

/// <summary>
/// Hesap işlemleri iş mantığı. Şu anki kullanıcıyı IOperationContext'ten alır.
/// </summary>
public class AccountService : IAccountService
{
    private readonly IAccountRepository _accounts;
    private readonly ICardRepository _cards;
    private readonly ITransactionRepository _transactions;
    private readonly IOperationContext _ctx;
    private readonly IValidator<CreateAccountRequest> _createValidator;

    public AccountService(
        IAccountRepository accounts,
        ICardRepository cards,
        ITransactionRepository transactions,
        IOperationContext ctx,
        IValidator<CreateAccountRequest> createValidator)
    {
        _accounts = accounts;
        _cards = cards;
        _transactions = transactions;
        _ctx = ctx;
        _createValidator = createValidator;
    }

    public async Task<AccountDto> OpenAccountAsync(CreateAccountRequest request)
    {
        var validation = await _createValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            var messages = validation.Errors.Select(e => e.ErrorMessage).ToList();
            throw new Common.Exceptions.ValidationException(messages);
        }

        // Benzersiz IBAN üret (çakışırsa yeniden dene)
        string iban;
        do
        {
            iban = IbanGenerator.Generate();
        }
        while (await _accounts.IbanExistsAsync(iban));

        var account = new Account
        {
            Id = Guid.NewGuid(),
            UserId = _ctx.ActingUserId, // hesap, işlemin sahibine ait (müşteri)
            Iban = iban,
            AccountType = request.AccountType,
            Balance = 0m, // yeni hesap sıfır bakiyeyle açılır
            IsActive = true,
            IsFrozen = false,
            CreatedAt = DateTime.UtcNow,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };

        await _accounts.AddAsync(account);
        return Map(account);
    }

    public async Task<List<AccountDto>> GetMyAccountsAsync()
    {
        var accounts = await _accounts.GetByUserIdAsync(_ctx.ActingUserId);
        // Kapalı hesaplar müşteri listesinde gösterilmez; dondurulmuş hesaplar gösterilir.
        return accounts.Where(a => a.IsActive).Select(Map).ToList();
    }

    public async Task<AccountDto> CloseAccountAsync(Guid accountId, CloseAccountRequest request)
    {
        var account = await GetOwnedAsync(accountId);

        if (!account.IsActive)
            throw new BusinessException("Hesap zaten kapalı.");
        // Banka bloğu varken müşteri hesabı kapatıp parayı çekemez
        if (account.FreezeType == FreezeType.Bank)
            throw new BusinessException(
                "Hesabınız banka tarafından donduruldu; kapatma için şubenize başvurun.");

        // Bakiye varsa başka bir aktif hesaba aktar (hesap kapanınca para kaybolmaz)
        if (account.Balance > 0m)
        {
            if (request.TargetAccountId is null)
                throw new BusinessException(
                    "Hesapta bakiye var; kapatmadan önce bakiyenin aktarılacağı hesabı seçin.");

            var target = await GetOwnedAsync(request.TargetAccountId.Value);
            if (target.Id == account.Id)
                throw new BusinessException("Bakiye aynı hesaba aktarılamaz.");
            if (!target.IsActive || target.IsFrozen)
                throw new BusinessException("Hedef hesap aktif değil; başka bir hesap seçin.");

            var amount = account.Balance;
            account.Balance = 0m;
            target.Balance += amount;

            var sweep = new Transaction
            {
                Id = Guid.NewGuid(),
                Type = TransactionType.Transfer,
                FromAccountId = account.Id,
                FromIban = account.Iban,
                ToAccountId = target.Id,
                ToIban = target.Iban,
                Amount = amount,
                Description = "Hesap kapanışı", // Transaction.Description max 20 karakter
                CreatedAt = DateTime.UtcNow,
                Channel = _ctx.Channel,
                PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
            };
            await _transactions.AddAsync(sweep); // bakiye değişiklikleriyle birlikte atomik kaydeder
        }

        // Hesaba bağlı kartları sil ve hesabı pasifleştir
        var cards = await _cards.GetByAccountIdAsync(account.Id);
        if (cards.Count > 0)
            _cards.RemoveRange(cards);
        account.IsActive = false;
        account.IsFrozen = false;
        account.FreezeType = FreezeType.None;
        await _accounts.SaveChangesAsync();

        return Map(account);
    }

    public async Task<AccountDto> FreezeAccountAsync(Guid accountId)
    {
        var account = await GetOwnedAsync(accountId);

        if (!account.IsActive)
            throw new BusinessException("Kapalı hesap dondurulamaz.");
        if (account.IsFrozen)
            throw new BusinessException("Hesap zaten dondurulmuş.");

        account.IsFrozen = true;
        account.FreezeType = FreezeType.Customer; // müşteri kendi dondurdu

        // Onaylı kartları geçici olarak bloke et (hesap aktifleşince geri açılır)
        var cards = await _cards.GetByAccountIdAsync(account.Id);
        foreach (var card in cards.Where(c => c.Status == CardStatus.Approved))
            card.Status = CardStatus.Blocked;

        await _accounts.SaveChangesAsync();
        return Map(account);
    }

    public async Task<AccountDto> ReactivateAccountAsync(Guid accountId)
    {
        var account = await GetOwnedAsync(accountId);

        if (!account.IsActive)
            throw new BusinessException("Kapalı hesap aktifleştirilemez.");
        if (!account.IsFrozen)
            throw new BusinessException("Hesap zaten aktif.");
        // Banka tarafından konan bloğu müşteri kaldıramaz
        if (account.FreezeType == FreezeType.Bank)
            throw new BusinessException(
                "Hesabınız banka tarafından donduruldu; lütfen şubenize başvurun.");

        account.IsFrozen = false;
        account.FreezeType = FreezeType.None;

        // Dondurma sırasında bloke edilen kartları geri onaylıya çevir
        var cards = await _cards.GetByAccountIdAsync(account.Id);
        foreach (var card in cards.Where(c => c.Status == CardStatus.Blocked))
            card.Status = CardStatus.Approved;

        await _accounts.SaveChangesAsync();
        return Map(account);
    }

    // Hesap var mı ve bu kullanıcıya mı ait? (başkasının hesabını "bulunamadı" gibi gizle)
    private async Task<Account> GetOwnedAsync(Guid accountId)
    {
        var account = await _accounts.GetByIdAsync(accountId);
        if (account is null || account.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Hesap bulunamadı.");
        return account;
    }

    // Entity -> DTO dönüşümü (hassas/iç alanlar dışarı çıkmaz)
    private static AccountDto Map(Account a) =>
        new(a.Id, a.Iban, a.AccountType, a.Balance, a.IsActive, a.IsFrozen,
            a.FreezeType.ToString(), a.CreatedAt);
}
