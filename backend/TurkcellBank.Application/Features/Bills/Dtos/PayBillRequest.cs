namespace TurkcellBank.Application.Features.Bills.Dtos;

/// <summary>
/// Fatura ödeme isteği. Tutar SUNUCU tarafında (kurum + abone no + dönem)
/// üzerinden yeniden hesaplanır; istemciden tutar alınmaz (manipülasyon önlenir).
/// </summary>
public record PayBillRequest(string BillerCode, string SubscriberNo, Guid AccountId);
