using FluentValidation;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Accounts.Dtos;
using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Features.Accounts;

/// <summary>
/// Hesap işlemleri iş mantığı. Şu anki kullanıcıyı ICurrentUserService'ten alır.
/// </summary>
public class AccountService : IAccountService
{
    private readonly IAccountRepository _accounts;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateAccountRequest> _createValidator;

    public AccountService(
        IAccountRepository accounts,
        ICurrentUserService currentUser,
        IValidator<CreateAccountRequest> createValidator)
    {
        _accounts = accounts;
        _currentUser = currentUser;
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
            UserId = _currentUser.UserId, // hesap, giriş yapan kullanıcıya ait
            Iban = iban,
            AccountType = request.AccountType,
            Balance = 0m, // yeni hesap sıfır bakiyeyle açılır
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        await _accounts.AddAsync(account);
        return Map(account);
    }

    public async Task<List<AccountDto>> GetMyAccountsAsync()
    {
        var accounts = await _accounts.GetByUserIdAsync(_currentUser.UserId);
        return accounts.Select(Map).ToList();
    }

    public async Task<AccountDto> CloseAccountAsync(Guid accountId)
    {
        var account = await _accounts.GetByIdAsync(accountId);

        // Güvenlik: hesap yoksa VEYA başkasının hesabıysa "bulunamadı" de
        // (başkasının hesabının varlığını sızdırma).
        if (account is null || account.UserId != _currentUser.UserId)
        {
            throw new NotFoundException("Hesap bulunamadı.");
        }

        if (!account.IsActive)
        {
            throw new BusinessException("Hesap zaten kapalı.");
        }

        account.IsActive = false; // hesap silinmez, pasifleştirilir
        await _accounts.SaveChangesAsync();

        return Map(account);
    }

    // Entity -> DTO dönüşümü (hassas/iç alanlar dışarı çıkmaz)
    private static AccountDto Map(Account a) =>
        new(a.Id, a.Iban, a.AccountType, a.Balance, a.IsActive, a.CreatedAt);
}
