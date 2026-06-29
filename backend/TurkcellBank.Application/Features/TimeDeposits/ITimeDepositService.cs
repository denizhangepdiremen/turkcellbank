using TurkcellBank.Application.Features.TimeDeposits.Dtos;

namespace TurkcellBank.Application.Features.TimeDeposits;

public interface ITimeDepositService
{
    /// <summary>Sunulan vadeli mevduat ürünleri (vade + oran).</summary>
    List<TimeDepositProductDto> GetProducts();

    /// <summary>Vadeli mevduatlarım.</summary>
    Task<List<TimeDepositDto>> GetMineAsync();

    /// <summary>Yeni vadeli mevduat aç (anapara kaynak hesaptan kilitlenir).</summary>
    Task<TimeDepositDto> OpenAsync(OpenTimeDepositRequest request);

    /// <summary>Vadeli mevduatı erken boz (faiz ödenmez, anapara döner).</summary>
    Task<TimeDepositDto> CloseEarlyAsync(Guid id);
}

/// <summary>
/// Vadesi dolmuş mevduatları işleyen sistem servisi. Arka plandaki bir
/// BackgroundService tarafından periyodik çağrılır; istek bağlamına bağlı DEĞİLDİR.
/// </summary>
public interface ITimeDepositMaturityProcessor
{
    /// <summary>Vadesi dolmuş aktif mevduatları işler. İşlenen sayıyı döner.</summary>
    Task<int> ProcessMaturedAsync(DateTime nowUtc, CancellationToken ct = default);
}
