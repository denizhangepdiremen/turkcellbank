namespace TurkcellBank.Application.Features.Bills.Dtos;

/// <summary>Ödenmiş fatura kaydı (müşteri geçmişi).</summary>
public record BillPaymentDto(
    Guid Id,
    string BillerName,
    string Category,
    string SubscriberNo,
    string Period,
    decimal Amount,
    string? AccountIban,
    DateTime CreatedAt);

/// <summary>Ödenmiş fatura kaydı (admin/personel görünümü).</summary>
public record AdminBillPaymentDto(
    Guid Id,
    string PayerName,
    string PayerEmail,
    string BillerName,
    string SubscriberNo,
    decimal Amount,
    DateTime CreatedAt);
