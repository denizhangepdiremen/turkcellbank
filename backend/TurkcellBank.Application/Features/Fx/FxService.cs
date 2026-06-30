using FluentValidation;
using TurkcellBank.Application.Common;
using TurkcellBank.Application.Common.Exceptions;
using TurkcellBank.Application.Common.Interfaces;
using TurkcellBank.Application.Features.Fx.Dtos;
using TurkcellBank.Domain.Entities;
using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Fx;

/// <summary>
/// Döviz/altın alış-satış iş mantığı. Güncel kullanıcıyı IOperationContext'ten alır.
/// Alış: TL hesabından satış kuruyla düşülür, döviz hesabına miktar eklenir.
/// Satış: döviz hesabından düşülür, TL hesabına alış kuruyla eklenir. İki bacaklı, atomik.
/// </summary>
public class FxService : IFxService
{
    private readonly IExchangeRateRepository _rates;
    private readonly IFxTradeRepository _trades;
    private readonly IAccountRepository _accounts;
    private readonly IOperationContext _ctx;
    private readonly IValidator<FxTradeRequest> _tradeValidator;

    public FxService(
        IExchangeRateRepository rates,
        IFxTradeRepository trades,
        IAccountRepository accounts,
        IOperationContext ctx,
        IValidator<FxTradeRequest> tradeValidator)
    {
        _rates = rates;
        _trades = trades;
        _accounts = accounts;
        _ctx = ctx;
        _tradeValidator = tradeValidator;
    }

    public async Task<List<ExchangeRateDto>> GetRatesAsync()
    {
        var all = await _rates.GetAllAsync();
        // Kur tahtası katalog sırasıyla (USD, EUR, Altın) dönsün.
        return FxCatalog.Tradable
            .Select(info => all.FirstOrDefault(r => r.Currency == info.Currency))
            .Where(r => r is not null)
            .Select(r => Map(r!))
            .ToList();
    }

    public async Task<FxQuoteDto> GetQuoteAsync(FxQuoteRequest request)
    {
        if (!FxCatalog.IsTradable(request.Currency))
            throw new BusinessException("Geçersiz para birimi.");
        if (request.Amount <= 0)
            throw new BusinessException("Miktar sıfırdan büyük olmalı.");

        var rateRow = await _rates.GetByCurrencyAsync(request.Currency)
            ?? throw new NotFoundException("Kur bilgisi bulunamadı.");

        var rate = request.Side == FxTradeSide.Buy ? rateRow.SellRate : rateRow.BuyRate;
        var tryAmount = Math.Round(request.Amount * rate, 2, MidpointRounding.AwayFromZero);

        return new FxQuoteDto(request.Side, request.Currency, request.Amount, rate, tryAmount);
    }

    public async Task<FxTradeDto> TradeAsync(FxTradeRequest request)
    {
        var validation = await _tradeValidator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new Common.Exceptions.ValidationException(
                validation.Errors.Select(e => e.ErrorMessage).ToList());

        var rateRow = await _rates.GetByCurrencyAsync(request.Currency)
            ?? throw new NotFoundException("Kur bilgisi bulunamadı.");

        var rate = request.Side == FxTradeSide.Buy ? rateRow.SellRate : rateRow.BuyRate;
        var tryAmount = Math.Round(request.Amount * rate, 2, MidpointRounding.AwayFromZero);
        if (tryAmount < FxCatalog.MinTradeTry)
            throw new BusinessException($"İşlem tutarı en az {FxCatalog.MinTradeTry:N0} TL olmalı.");

        // TL bacağı hesabı: sahibi mi, aktif mi, gerçekten TL mi?
        var tryAccount = await _accounts.GetByIdAsync(request.TryAccountId);
        if (tryAccount is null || tryAccount.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Hesap bulunamadı.");
        if (tryAccount.Currency != Currency.TRY)
            throw new BusinessException("Karşı bacak için bir TL hesabı seçin.");
        if (!tryAccount.IsActive) throw new BusinessException("Seçilen TL hesabı kapalı.");
        if (tryAccount.IsFrozen) throw new BusinessException("Seçilen TL hesabı dondurulmuş.");

        var now = DateTime.UtcNow;
        var code = CodeOf(request.Currency);

        Transaction debitLeg, creditLeg;
        Account foreignAccount;

        if (request.Side == FxTradeSide.Buy)
        {
            if (tryAccount.Balance < tryAmount)
                throw new BusinessException("Yetersiz bakiye.");

            foreignAccount = await ResolveForeignAccountAsync(request.Currency, createIfMissing: true);

            tryAccount.Balance -= tryAmount;
            foreignAccount.Balance += request.Amount;

            debitLeg = new Transaction
            {
                Id = Guid.NewGuid(),
                Type = TransactionType.FxBuy,
                FromAccountId = tryAccount.Id,
                FromIban = tryAccount.Iban,
                Amount = tryAmount,
                Description = $"{code} alış",
                CreatedAt = now,
                Channel = _ctx.Channel,
                PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
            };
            creditLeg = new Transaction
            {
                Id = Guid.NewGuid(),
                Type = TransactionType.FxBuy,
                ToAccountId = foreignAccount.Id,
                ToIban = foreignAccount.Iban,
                Amount = request.Amount,
                Description = $"{code} alış",
                CreatedAt = now,
                Channel = _ctx.Channel,
                PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
            };
        }
        else // Sell
        {
            foreignAccount = await ResolveForeignAccountAsync(request.Currency, createIfMissing: false)
                ?? throw new BusinessException($"{code} hesabınız bulunmuyor.");
            if (!foreignAccount.IsActive) throw new BusinessException($"{code} hesabınız kapalı.");
            if (foreignAccount.IsFrozen) throw new BusinessException($"{code} hesabınız dondurulmuş.");
            if (foreignAccount.Balance < request.Amount)
                throw new BusinessException($"Yetersiz {code} bakiyesi.");

            foreignAccount.Balance -= request.Amount;
            tryAccount.Balance += tryAmount;

            debitLeg = new Transaction
            {
                Id = Guid.NewGuid(),
                Type = TransactionType.FxSell,
                FromAccountId = foreignAccount.Id,
                FromIban = foreignAccount.Iban,
                Amount = request.Amount,
                Description = $"{code} satış",
                CreatedAt = now,
                Channel = _ctx.Channel,
                PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
            };
            creditLeg = new Transaction
            {
                Id = Guid.NewGuid(),
                Type = TransactionType.FxSell,
                ToAccountId = tryAccount.Id,
                ToIban = tryAccount.Iban,
                Amount = tryAmount,
                Description = $"{code} satış",
                CreatedAt = now,
                Channel = _ctx.Channel,
                PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
            };
        }

        var trade = new FxTrade
        {
            Id = Guid.NewGuid(),
            UserId = _ctx.ActingUserId,
            Side = request.Side,
            Currency = request.Currency,
            Amount = request.Amount,
            Rate = rate,
            TryAmount = tryAmount,
            TryAccountId = tryAccount.Id,
            ForeignAccountId = foreignAccount.Id,
            CreatedAt = now,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };

        // İşlem kaydı + iki bacak + bakiye değişiklikleri tek SaveChanges ile atomik.
        await _trades.AddTradeAsync(trade, debitLeg, creditLeg);

        return new FxTradeDto(
            trade.Id, trade.Side, trade.Currency, code, trade.Amount, trade.Rate,
            trade.TryAmount, tryAccount.Iban, foreignAccount.Iban, trade.CreatedAt);
    }

    public async Task<List<FxTradeDto>> GetMyTradesAsync()
    {
        var trades = await _trades.GetByUserIdAsync(_ctx.ActingUserId);
        var accounts = await _accounts.GetByUserIdAsync(_ctx.ActingUserId);
        var ibanById = accounts.ToDictionary(a => a.Id, a => a.Iban);
        return trades.Select(t => new FxTradeDto(
            t.Id, t.Side, t.Currency, CodeOf(t.Currency), t.Amount, t.Rate, t.TryAmount,
            ibanById.GetValueOrDefault(t.TryAccountId, "—"),
            ibanById.GetValueOrDefault(t.ForeignAccountId, "—"),
            t.CreatedAt)).ToList();
    }

    // Kullanıcının verilen para birimindeki aktif hesabını bulur; yoksa (alışta) açar.
    private async Task<Account> ResolveForeignAccountAsync(Currency currency, bool createIfMissing)
    {
        var accounts = await _accounts.GetByUserIdAsync(_ctx.ActingUserId);
        var existing = accounts.FirstOrDefault(a => a.IsActive && a.Currency == currency);
        if (existing is not null) return existing;
        if (!createIfMissing) return null!;

        string iban;
        do { iban = IbanGenerator.Generate(); }
        while (await _accounts.IbanExistsAsync(iban));

        var account = new Account
        {
            Id = Guid.NewGuid(),
            UserId = _ctx.ActingUserId,
            Iban = iban,
            AccountType = AccountType.Bireysel,
            Currency = currency,
            Balance = 0m,
            IsActive = true,
            IsFrozen = false,
            CreatedAt = DateTime.UtcNow,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };
        await _accounts.AddAsync(account); // boş hesabı oluştur (bakiye sonra atomik işlenir)
        return account;
    }

    private static string CodeOf(Currency c) =>
        FxCatalog.Tradable.FirstOrDefault(i => i.Currency == c)?.Code ?? c.ToString();

    private static ExchangeRateDto Map(ExchangeRate r)
    {
        var info = FxCatalog.Tradable.First(i => i.Currency == r.Currency);
        return new ExchangeRateDto(
            r.Currency, info.Code, info.Name, info.Unit, r.BuyRate, r.SellRate, r.UpdatedAt);
    }
}
