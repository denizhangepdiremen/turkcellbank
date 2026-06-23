namespace TurkcellBank.Application.Features.Transactions.Dtos;

/// <summary>Şube müdürü onay kuyruğundaki yüksek tutarlı havale.</summary>
public record PendingTransferDto(
    Guid Id,
    string CustomerName,
    string FromIban,
    string ToIban,
    decimal Amount,
    string? Description,
    DateTime CreatedAt);

/// <summary>
/// Şube havale sonucu: tutar eşiğin altındaysa hemen gerçekleşir (Completed),
/// üstündeyse şube müdürü onayına gönderilir (PendingApproval).
/// </summary>
public record BranchTransferResultDto(string Status, decimal Amount);
