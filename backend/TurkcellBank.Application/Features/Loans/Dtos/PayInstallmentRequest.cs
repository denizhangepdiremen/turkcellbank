namespace TurkcellBank.Application.Features.Loans.Dtos;

/// <summary>Kredi taksiti ödeme isteği: taksitin çekileceği hesap.</summary>
public record PayInstallmentRequest(Guid AccountId);
