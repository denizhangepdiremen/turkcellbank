using TurkcellBank.Domain.Enums;

namespace TurkcellBank.Application.Features.Fx.Dtos;

/// <summary>Kur tahtası satırı (1 birim = ? TL).</summary>
public record ExchangeRateDto(
    Currency Currency,
    string Code,
    string Name,
    string Unit,
    decimal BuyRate,
    decimal SellRate,
    DateTime UpdatedAt);

/// <summary>Alış/satış öncesi anlık fiyat sorgusu.</summary>
public record FxQuoteRequest(FxTradeSide Side, Currency Currency, decimal Amount);

/// <summary>Sorgu sonucu: uygulanacak kur + TL karşılığı.</summary>
public record FxQuoteDto(
    FxTradeSide Side,
    Currency Currency,
    decimal Amount,
    decimal Rate,
    decimal TryAmount);

/// <summary>
/// Alış/satış isteği. <paramref name="TryAccountId"/> TL bacağının hesabıdır
/// (alışta para çıkar, satışta para girer). Döviz/altın hesabı para biriminden
/// otomatik bulunur (alışta yoksa açılır).
/// </summary>
public record FxTradeRequest(
    FxTradeSide Side,
    Currency Currency,
    decimal Amount,
    Guid TryAccountId);

/// <summary>Gerçekleşen işlem sonucu (dekont/özet).</summary>
public record FxTradeDto(
    Guid Id,
    FxTradeSide Side,
    Currency Currency,
    string Code,
    decimal Amount,
    decimal Rate,
    decimal TryAmount,
    string TryIban,
    string ForeignIban,
    DateTime CreatedAt);
