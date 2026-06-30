using TurkcellBank.Domain.Entities;

namespace TurkcellBank.Application.Common.Interfaces;

/// <summary>Döviz/altın işlem (FxTrade) veri erişimi.</summary>
public interface IFxTradeRepository
{
    /// <summary>
    /// İşlem kaydını ve iki bacağın işlem (Transaction) satırlarını ekleyip
    /// TEK SaveChanges ile kaydeder. O an izlenen hesap bakiyesi değişiklikleri de
    /// aynı kayıtta yazılır → ATOMİK (ya hepsi olur ya hiçbiri).
    /// </summary>
    Task AddTradeAsync(FxTrade trade, Transaction debitLeg, Transaction creditLeg);

    /// <summary>Kullanıcının döviz/altın işlemleri (yeniden eskiye).</summary>
    Task<List<FxTrade>> GetByUserIdAsync(Guid userId);
}
