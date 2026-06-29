namespace TurkcellBank.Application.Features.Bills.Dtos;

/// <summary>Fatura sorgulama isteği (kurum + abone/tesisat no).</summary>
public record BillInquiryRequest(string BillerCode, string SubscriberNo);
