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
    private readonly IFxRateAlertRepository _alerts;
    private readonly IAccountRepository _accounts;
    private readonly IOperationContext _ctx;
    private readonly IValidator<FxTradeRequest> _tradeValidator;

    public FxService(
        IExchangeRateRepository rates,
        IFxTradeRepository trades,
        IFxRateAlertRepository alerts,
        IAccountRepository accounts,
        IOperationContext ctx,
        IValidator<FxTradeRequest> tradeValidator)
    {
        _rates = rates;
        _trades = trades;
        _alerts = alerts;
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

    public async Task<FxConversionDto> ConvertAsync(FxConversionRequest request)
    {
        if (!FxCatalog.IsTradable(request.FromCurrency) || !FxCatalog.IsTradable(request.ToCurrency))
            throw new BusinessException("Çapraz dönüşüm için TRY dışı iki birim seçin.");
        if (request.FromCurrency == request.ToCurrency)
            throw new BusinessException("Kaynak ve hedef birim farklı olmalı.");
        if (request.Amount <= 0)
            throw new BusinessException("Miktar sıfırdan büyük olmalı.");

        var fromRateRow = await _rates.GetByCurrencyAsync(request.FromCurrency)
            ?? throw new NotFoundException("Kaynak kur bilgisi bulunamadı.");
        var toRateRow = await _rates.GetByCurrencyAsync(request.ToCurrency)
            ?? throw new NotFoundException("Hedef kur bilgisi bulunamadı.");

        var fromAccount = await ResolveForeignAccountAsync(request.FromCurrency, createIfMissing: false)
            ?? throw new BusinessException($"{CodeOf(request.FromCurrency)} hesabınız bulunmuyor.");
        if (!fromAccount.IsActive) throw new BusinessException("Kaynak hesap kapalı.");
        if (fromAccount.IsFrozen) throw new BusinessException("Kaynak hesap dondurulmuş.");
        if (fromAccount.Balance < request.Amount)
            throw new BusinessException($"Yetersiz {CodeOf(request.FromCurrency)} bakiyesi.");

        var toAccount = await ResolveForeignAccountAsync(request.ToCurrency, createIfMissing: true);

        var tryAmount = Math.Round(request.Amount * fromRateRow.BuyRate, 2, MidpointRounding.AwayFromZero);
        if (tryAmount < FxCatalog.MinTradeTry)
            throw new BusinessException($"İşlem tutarı en az {FxCatalog.MinTradeTry:N0} TL olmalı.");

        var toAmount = Math.Round(tryAmount / toRateRow.SellRate, 2, MidpointRounding.AwayFromZero);
        var now = DateTime.UtcNow;
        var fromCode = CodeOf(request.FromCurrency);
        var toCode = CodeOf(request.ToCurrency);

        fromAccount.Balance -= request.Amount;
        toAccount.Balance += toAmount;

        var debitLeg = new Transaction
        {
            Id = Guid.NewGuid(),
            Type = TransactionType.FxConvert,
            FromAccountId = fromAccount.Id,
            FromIban = fromAccount.Iban,
            ToAccountId = toAccount.Id,
            ToIban = toAccount.Iban,
            Amount = request.Amount,
            Description = $"{fromCode}->{toCode} dönüşüm",
            CreatedAt = now,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };
        var creditLeg = new Transaction
        {
            Id = Guid.NewGuid(),
            Type = TransactionType.FxConvert,
            FromAccountId = fromAccount.Id,
            FromIban = fromAccount.Iban,
            ToAccountId = toAccount.Id,
            ToIban = toAccount.Iban,
            Amount = toAmount,
            Description = $"{fromCode}->{toCode} dönüşüm",
            CreatedAt = now,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };
        var conversion = new FxConversion
        {
            Id = Guid.NewGuid(),
            UserId = _ctx.ActingUserId,
            FromCurrency = request.FromCurrency,
            ToCurrency = request.ToCurrency,
            FromAmount = request.Amount,
            ToAmount = toAmount,
            TryAmount = tryAmount,
            FromRate = fromRateRow.BuyRate,
            ToRate = toRateRow.SellRate,
            FromAccountId = fromAccount.Id,
            ToAccountId = toAccount.Id,
            CreatedAt = now,
            Channel = _ctx.Channel,
            PerformedByEmployeeId = _ctx.PerformedByEmployeeId,
        };

        await _trades.AddConversionAsync(conversion, debitLeg, creditLeg);

        return new FxConversionDto(
            conversion.Id,
            conversion.FromCurrency,
            fromCode,
            conversion.ToCurrency,
            toCode,
            conversion.FromAmount,
            conversion.ToAmount,
            conversion.TryAmount,
            conversion.FromRate,
            conversion.ToRate,
            fromAccount.Iban,
            toAccount.Iban,
            conversion.CreatedAt);
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

    public async Task<List<FxConversionDto>> GetMyConversionsAsync()
    {
        var conversions = await _trades.GetConversionsByUserIdAsync(_ctx.ActingUserId);
        var accounts = await _accounts.GetByUserIdAsync(_ctx.ActingUserId);
        var ibanById = accounts.ToDictionary(a => a.Id, a => a.Iban);
        return conversions.Select(c => new FxConversionDto(
            c.Id,
            c.FromCurrency,
            CodeOf(c.FromCurrency),
            c.ToCurrency,
            CodeOf(c.ToCurrency),
            c.FromAmount,
            c.ToAmount,
            c.TryAmount,
            c.FromRate,
            c.ToRate,
            ibanById.GetValueOrDefault(c.FromAccountId, "—"),
            ibanById.GetValueOrDefault(c.ToAccountId, "—"),
            c.CreatedAt)).ToList();
    }

    public async Task<List<FxRateAlertDto>> GetMyAlertsAsync()
    {
        var alerts = await _alerts.GetByUserIdAsync(_ctx.ActingUserId);
        return alerts.Select(MapAlert).ToList();
    }

    public async Task<FxRateAlertDto> CreateAlertAsync(CreateFxRateAlertRequest request)
    {
        if (!FxCatalog.IsTradable(request.Currency))
            throw new BusinessException("Geçersiz para birimi.");
        if (request.TargetRate <= 0)
            throw new BusinessException("Hedef kur sıfırdan büyük olmalı.");

        var currentRate = await _rates.GetByCurrencyAsync(request.Currency)
            ?? throw new NotFoundException("Kur bilgisi bulunamadı.");

        var alert = new FxRateAlert
        {
            Id = Guid.NewGuid(),
            UserId = _ctx.ActingUserId,
            Currency = request.Currency,
            Direction = request.Direction,
            TargetRate = request.TargetRate,
            LastCheckedRate = MidRate(currentRate),
            IsActive = true,
            IsTriggered = false,
            CreatedAt = DateTime.UtcNow,
        };

        await _alerts.AddAsync(alert);
        return MapAlert(alert);
    }

    public async Task DeleteAlertAsync(Guid id)
    {
        var alert = await _alerts.GetByIdAsync(id);
        if (alert is null || alert.UserId != _ctx.ActingUserId)
            throw new NotFoundException("Alarm bulunamadı.");

        alert.IsActive = false;
        await _alerts.SaveChangesAsync();
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

    private static decimal MidRate(ExchangeRate rate) => (rate.BuyRate + rate.SellRate) / 2m;

    private static FxRateAlertDto MapAlert(FxRateAlert alert) =>
        new(
            alert.Id,
            alert.Currency,
            CodeOf(alert.Currency),
            alert.Direction,
            alert.TargetRate,
            alert.LastCheckedRate,
            alert.IsActive,
            alert.IsTriggered,
            alert.TriggeredAt,
            alert.CreatedAt);

    private static ExchangeRateDto Map(ExchangeRate r)
    {
        var info = FxCatalog.Tradable.First(i => i.Currency == r.Currency);
        return new ExchangeRateDto(
            r.Currency, info.Code, info.Name, info.Unit, r.BuyRate, r.SellRate, r.UpdatedAt);
    }
}
