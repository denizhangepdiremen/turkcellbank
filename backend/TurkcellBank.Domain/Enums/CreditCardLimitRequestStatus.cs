namespace TurkcellBank.Domain.Enums;

/// <summary>Limit artış talebi karar durumu.</summary>
public enum CreditCardLimitRequestStatus
{
    Pending,
    PendingApproval,
    Approved,
    Rejected,
}
