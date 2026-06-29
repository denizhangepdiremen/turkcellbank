using FluentValidation;
using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.TimeDeposits.Dtos;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.TimeDeposits;

public class TimeDepositService : ITimeDepositService
{
    private readonly ITimeDepositRepository _deposits;
    private readonly IAccountRepository _accounts;
    private readonly ITransactionRepository _transactions;
    private readonly IOperationContext _ctx;
    private readonly IValidator<OpenTimeDepositRequest> _validator;

    public TimeDepositService(
        ITimeDepositRepository deposits,
        IAccountRepository accounts,
        ITransactionRepository transactions,
        IOperationContext ctx,
        IValidator<OpenTimeDepositRequest> validator)
    {
        _deposits = deposits;
        _accounts = accounts;
        _transactions = transactions;
        _ctx = ctx;
        _validator = validator;
    }

    public List<TimeDepositProductDto> GetProducts() =>
        TimeDepositProducts.All
            .Select(p => new TimeDepositProductDto(p.TermDays, p.AnnualRate, p.Label))
            .ToList();

    public async Task<List<TimeDepositDto>> GetMineAsync()
    {
        var list = await _deposits.GetByUserIdAsync(_ctx.ActingUserId);
        var accounts = await _accounts.GetByUserIdAsync(_ctx.ActingUserId);
        var ibanById = accounts.ToDictionary(a => a.Id, a => a.Iban);
        return list.Select(d => Map(d, ibanById.GetValueOrDefault(d.SourceAccountId, "—"))).ToList();
    }

    public async Task<TimeDepositDto> OpenAsync(OpenTimeDepositRequest request)
    {
        var validation = await _validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new Common.Exceptions.ValidationException(
                validation.Errors.Select(e => e.ErrorMessage).ToList());

        var product = TimeDepositProducts.Find(request.TermDays)
            ?? throw new NotFoundException("Vade ürünü bulunamadı.");

        // Kaynak hesap işlemin sahibine mi ait? (varlığı sızdırma → NotFound)
        var account = await _accounts.GetByIdAsync(request.SourceAccountId);
        if (account is null || account.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Hesap bulunamadı.");
        if (!account.IsActive)
            throw new BusinessException("Seçilen hesap kapalı.");
        if (account.IsFrozen)
            throw new BusinessException("Seçilen hesap dondurulmuş.");
        if (account.Balance < request.Principal)
            throw new BusinessException("Yetersiz bakiye.");

        var (gross, withholding, net) = TimeDepositProducts.ComputeInterest(
            request.Principal, product.AnnualRate, product.TermDays);

        var now = DateTime.UtcNow;

        // Anaparayı hesaptan kilitle + mevduat kaydı + işlem kaydı (atomik)
        account.Balance -= request.Principal;

        var deposit = new TimeDeposit
        {
            Id = Guid.NewGuid(),
            UserId = _ctx.ActingUserId,
            SourceAccountId = account.Id,
            Principal = request.Principal,
            AnnualRate = product.AnnualRate,
            TermDays = product.TermDays,
            GrossInterest = gross,
            WithholdingTax = withholding,
            NetInterest = net,
            Status = TimeDepositStatus.Active,
            OpenedAt = now,
            MaturityDate = now.AddDays(product.TermDays),
        };

        var tx = new Transaction
        {
            Id = Guid.NewGuid(),
            Type = TransactionType.TimeDepositOpen,
            FromAccountId = account.Id,
            FromIban = account.Iban,
            Amount = request.Principal,
            Description = "Vadeli mevduat",
            CreatedAt = now,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };

        await _deposits.AddAsync(deposit);
        await _transactions.AddAsync(tx);

        return Map(deposit, account.Iban);
    }

    public async Task<TimeDepositDto> CloseEarlyAsync(Guid id)
    {
        var deposit = await _deposits.GetByIdAsync(id);
        if (deposit is null || deposit.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Vadeli mevduat bulunamadı.");
        if (deposit.Status != TimeDepositStatus.Active)
            throw new BusinessException("Yalnızca aktif mevduat bozulabilir.");

        var account = await _accounts.GetByIdAsync(deposit.SourceAccountId);
        if (account is null || !account.IsActive)
            throw new BusinessException("Anaparanın döneceği hesap uygun değil.");

        var now = DateTime.UtcNow;

        // Erken bozma: faiz ödenmez, yalnızca anapara döner
        account.Balance += deposit.Principal;
        deposit.Status = TimeDepositStatus.ClosedEarly;
        deposit.ClosedAt = now;

        var tx = new Transaction
        {
            Id = Guid.NewGuid(),
            Type = TransactionType.TimeDepositMaturity,
            ToAccountId = account.Id,
            ToIban = account.Iban,
            Amount = deposit.Principal,
            Description = "Vade bozma",
            CreatedAt = now,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };

        await _transactions.AddAsync(tx); // anapara iadesi + mevduat durumu birlikte kaydolur

        return Map(deposit, account.Iban);
    }

    private static TimeDepositDto Map(TimeDeposit d, string sourceIban) =>
        new(
            d.Id,
            d.SourceAccountId,
            sourceIban,
            d.Principal,
            d.AnnualRate,
            d.TermDays,
            d.GrossInterest,
            d.WithholdingTax,
            d.NetInterest,
            d.Principal + d.NetInterest,
            d.Status.ToString(),
            d.OpenedAt,
            d.MaturityDate,
            d.ClosedAt);
}
