namespace TurkcellBank.Application.Features.PaymentOrders.Dtos;

/// <summary>Düzenli ödeme talimatı (müşteri görünümü).</summary>
public record PaymentOrderDto(
    Guid Id,
    string Type,
    string Name,
    Guid SourceAccountId,
    string SourceIban,
    int DayOfMonth,
    DateTime NextRunDate,
    bool IsActive,
    DateTime? LastRunAt,
    string? LastStatus,
    string? Category,
    string? BillerName,
    string? SubscriberNo,
    string? TargetIban,
    string? TargetName,
    decimal? Amount,
    DateTime CreatedAt);
