using FluentValidation;
using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Transactions.Dtos;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Transactions;

/// <summary>
/// Para hareketleri iş mantığı: yatırma, transfer (banka içi), geçmiş.
/// Bakiye değişiklikleri + işlem kaydı tek SaveChanges ile atomik yazılır.
/// </summary>
public class TransactionService : ITransactionService
{
    private readonly IAccountRepository _accounts;
    private readonly ITransactionRepository _transactions;
    private readonly IOperationContext _ctx;
    private readonly TransferOptions _transferOptions;
    private readonly IValidator<DepositRequest> _depositValidator;
    private readonly IValidator<TransferRequest> _transferValidator;

    public TransactionService(
        IAccountRepository accounts,
        ITransactionRepository transactions,
        IOperationContext ctx,
        TransferOptions transferOptions,
        IValidator<DepositRequest> depositValidator,
        IValidator<TransferRequest> transferValidator)
    {
        _accounts = accounts;
        _transactions = transactions;
        _ctx = ctx;
        _transferOptions = transferOptions;
        _depositValidator = depositValidator;
        _transferValidator = transferValidator;
    }

    public async Task<TransactionDto> DepositAsync(DepositRequest request)
    {
        await ValidateAsync(_depositValidator, request);

        var account = await _accounts.GetByIdAsync(request.AccountId);
        EnsureOwnedAndActive(account);

        // Bakiyeyi artır + işlem kaydı (atomik)
        account!.Balance += request.Amount;

        var tx = new Transaction
        {
            Id = Guid.NewGuid(),
            Type = TransactionType.Deposit,
            ToAccountId = account.Id,
            ToIban = account.Iban,
            Amount = request.Amount,
            Description = "Para yatırma",
            CreatedAt = DateTime.UtcNow,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };
        await _transactions.AddAsync(tx); // hesabın yeni bakiyesini de kaydeder

        return new TransactionDto(tx.Id, tx.Type.ToString(), "In", tx.Amount, null, tx.Description, tx.Channel.ToString(), tx.CreatedAt);
    }

    public async Task<TransactionDto> TransferAsync(TransferRequest request)
    {
        await ValidateAsync(_transferValidator, request);

        // Fraud önlemi: belirli tutarın üzeri havaleler internet bankacılığında
        // yapılamaz; müşteri şubeye yönlendirilir. (Şube kanalında bu limit geçerli
        // değildir; çok yüksek tutarlar şube müdürü onayına BranchService'te düşer.)
        if (_ctx.Channel == Channel.Internet && request.Amount > _transferOptions.InternetLimit)
            throw new BusinessException(
                $"{_transferOptions.InternetLimit:N0} TL üzeri havaleler güvenlik nedeniyle " +
                "internetten yapılamaz; lütfen en yakın şubemize başvurun.");

        var from = await _accounts.GetByIdAsync(request.FromAccountId);
        EnsureOwnedAndActive(from);

        var toIban = request.ToIban.Replace(" ", "").ToUpperInvariant();
        var to = await _accounts.GetByIbanAsync(toIban);

        if (to is null || !to.IsActive)
            throw new BusinessException("Alıcı hesap bulunamadı veya kapalı.");

        if (to.Id == from!.Id)
            throw new BusinessException("Aynı hesaba transfer yapılamaz.");

        if (from.Balance < request.Amount)
            throw new BusinessException("Yetersiz bakiye.");

        // Para hareketi: gönderenden düş, alıcıya ekle
        from.Balance -= request.Amount;
        to.Balance += request.Amount;

        var tx = new Transaction
        {
            Id = Guid.NewGuid(),
            Type = TransactionType.Transfer,
            FromAccountId = from.Id,
            FromIban = from.Iban,
            ToAccountId = to.Id,
            ToIban = to.Iban,
            Amount = request.Amount,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };
        // Tek SaveChanges: iki bakiye + işlem birlikte (atomik)
        await _transactions.AddAsync(tx);

        return new TransactionDto(tx.Id, tx.Type.ToString(), "Out", tx.Amount, to.Iban, tx.Description, tx.Channel.ToString(), tx.CreatedAt);
    }

    public async Task<List<TransactionDto>> GetHistoryAsync(Guid accountId)
    {
        var account = await _accounts.GetByIdAsync(accountId);
        EnsureOwnedAndActive(account, requireActive: false); // kapalı hesabın geçmişi de görülebilir

        var list = await _transactions.GetByAccountIdAsync(accountId);

        // Her işlemi BU hesabın bakış açısıyla çevir (gelen mi giden mi)
        return list.Select(t =>
        {
            var isOutgoing = t.FromAccountId == accountId;
            var direction = isOutgoing ? "Out" : "In";
            var counterparty = isOutgoing ? t.ToIban : t.FromIban; // deposit'te FromIban null
            return new TransactionDto(
                t.Id, t.Type.ToString(), direction, t.Amount, counterparty, t.Description, t.Channel.ToString(), t.CreatedAt);
        }).ToList();
    }

    // --- yardımcılar ---

    private async Task ValidateAsync<T>(IValidator<T> validator, T request)
    {
        var result = await validator.ValidateAsync(request);
        if (!result.IsValid)
        {
            var messages = result.Errors.Select(e => e.ErrorMessage).ToList();
            throw new Common.Exceptions.ValidationException(messages);
        }
    }

    // Hesap var mı, bu kullanıcıya mı ait, (gerekiyorsa) aktif mi?
    private void EnsureOwnedAndActive(Account? account, bool requireActive = true)
    {
        if (account is null || account.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Hesap bulunamadı.");
        if (requireActive && !account.IsActive)
            throw new BusinessException("Hesap kapalı.");
    }
}
