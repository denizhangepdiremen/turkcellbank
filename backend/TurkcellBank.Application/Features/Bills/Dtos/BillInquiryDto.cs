namespace TurkcellBank.Application.Features.Bills.Dtos;

/// <summary>
/// Fatura sorgulama sonucu. <paramref name="IsPaid"/> true ise bu dönemin
/// faturası zaten ödenmiştir (tutar 0 döner).
/// </summary>
public record BillInquiryDto(
    string BillerCode,
    string BillerName,
    string Category,
    string SubscriberNo,
    string Period,
    decimal Amount,
    DateTime DueDate,
    bool IsPaid);
