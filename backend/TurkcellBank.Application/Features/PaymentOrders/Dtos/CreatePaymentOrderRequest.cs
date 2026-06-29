namespace TurkcellBank.Application.Features.PaymentOrders.Dtos;

/// <summary>
/// Düzenli ödeme talimatı oluşturma isteği.
/// <paramref name="Type"/> = "AutoBill" | "RecurringTransfer".
/// AutoBill için <paramref name="BillerCode"/> + <paramref name="SubscriberNo"/>;
/// RecurringTransfer için <paramref name="TargetIban"/> + <paramref name="Amount"/>.
/// </summary>
public record CreatePaymentOrderRequest(
    string Type,
    string Name,
    Guid SourceAccountId,
    int DayOfMonth,
    string? BillerCode,
    string? SubscriberNo,
    string? TargetIban,
    string? TargetName,
    decimal? Amount);
