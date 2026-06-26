namespace TurkcellBank.Application.Features.SavedRecipients.Dtos;

/// <summary>Kayıtlı alıcı bilgisi.</summary>
public record SavedRecipientDto(Guid Id, string Name, string Iban, string? Note, DateTime CreatedAt);
